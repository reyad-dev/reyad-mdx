!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    ${If} $hasPerUserInstallation == "1"
    ${AndIf} $hasPerMachineInstallation == "0"
      StrCpy $isForceCurrentInstall "1"
    ${ElseIf} $hasPerMachineInstallation == "1"
    ${AndIf} $hasPerUserInstallation == "0"
      StrCpy $isForceMachineInstall "1"
    ${EndIf}
  !endif
!macroend

!macro customPageAfterChangeDir
  !define MUI_PAGE_CUSTOMFUNCTION_PRE ShowDirectoryOnFirstInstall
  !insertmacro MUI_PAGE_DIRECTORY
  Function ShowDirectoryOnFirstInstall
    ; Preserve the registered path even when it uses an old product name.
    ReadRegStr $0 SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${If} $0 != ""
      Abort
    ${EndIf}
  FunctionEnd
!macroend
!macro customInit
  ${StdUtils.GetParameter} $0 "update-parent" ""
  ${If} $0 != ""
    ; Wait for the exact Electron process that authorized this update.
    System::Call 'kernel32::OpenProcess(i 0x00100000, i 0, i r0) p.r1'
    ${If} $1 != 0
      System::Call 'kernel32::WaitForSingleObject(p r1, i 30000) i.r2'
      System::Call 'kernel32::CloseHandle(p r1)'
      ${If} $2 != 0
        SetErrorLevel 1
        Quit
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

!define REYAD_PROGID "ReyadMDX.Document"
!define REYAD_LEGACY_PROGID "Markdown Document"
!define REYAD_CLASSES "Software\Classes"
!define REYAD_CAPABILITIES "Software\ReyadMDX\Capabilities"
!define REYAD_APPLICATION "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"

!macro eachReyadExtension action
  !insertmacro ${action} ".md"
  !insertmacro ${action} ".markdown"
  !insertmacro ${action} ".mdown"
  !insertmacro ${action} ".mkd"
  !insertmacro ${action} ".mdx"
  !insertmacro ${action} ".txt"
!macroend

!macro registerReyadExtension ext
  WriteRegStr SHELL_CONTEXT "${REYAD_CLASSES}\${ext}\OpenWithProgids" "${REYAD_PROGID}" ""
  WriteRegStr SHELL_CONTEXT "${REYAD_APPLICATION}\SupportedTypes" "${ext}" ""
  WriteRegStr SHELL_CONTEXT "${REYAD_CAPABILITIES}\FileAssociations" "${ext}" "${REYAD_PROGID}"
!macroend

!macro registerReyadProgId id
  WriteRegStr SHELL_CONTEXT "${REYAD_CLASSES}\${id}" "" "Markdown or text document"
  WriteRegStr SHELL_CONTEXT "${REYAD_CLASSES}\${id}\DefaultIcon" "" '"$appExe",0'
  WriteRegStr SHELL_CONTEXT "${REYAD_CLASSES}\${id}\shell\open\command" "" '"$appExe" "%1"'
!macroend

!macro customInstall
  !insertmacro registerReyadProgId "${REYAD_PROGID}"
  ; Existing Windows defaults may still point to the ID from previous installers.
  !insertmacro registerReyadProgId "${REYAD_LEGACY_PROGID}"

  WriteRegStr SHELL_CONTEXT "${REYAD_APPLICATION}" "FriendlyAppName" "ReyadMDX"
  WriteRegStr SHELL_CONTEXT "${REYAD_APPLICATION}\shell\open\command" "" '"$appExe" "%1"'

  WriteRegStr SHELL_CONTEXT "${REYAD_CAPABILITIES}" "ApplicationName" "ReyadMDX"
  WriteRegStr SHELL_CONTEXT "${REYAD_CAPABILITIES}" "ApplicationDescription" "Read and edit Markdown and text files."
  WriteRegStr SHELL_CONTEXT "Software\RegisteredApplications" "ReyadMDX" "${REYAD_CAPABILITIES}"
  !insertmacro eachReyadExtension registerReyadExtension
  System::Call 'shell32::SHChangeNotify(i, i, p, p) v (0x08000000, 0, 0, 0)'
!macroend

!macro unregisterReyadExtension ext
  DeleteRegValue SHELL_CONTEXT "${REYAD_CLASSES}\${ext}\OpenWithProgids" "${REYAD_PROGID}"
  ReadRegStr $0 SHELL_CONTEXT "${REYAD_CLASSES}\${ext}" ""
  ${If} $0 == "${REYAD_LEGACY_PROGID}"
    ReadRegStr $0 SHELL_CONTEXT "${REYAD_CLASSES}\${ext}" "${REYAD_LEGACY_PROGID}_backup"
    ${If} $0 == ""
    ${OrIf} $0 == "${REYAD_LEGACY_PROGID}"
      DeleteRegValue SHELL_CONTEXT "${REYAD_CLASSES}\${ext}" ""
    ${Else}
      WriteRegStr SHELL_CONTEXT "${REYAD_CLASSES}\${ext}" "" "$0"
    ${EndIf}
  ${EndIf}
  DeleteRegValue SHELL_CONTEXT "${REYAD_CLASSES}\${ext}" "${REYAD_LEGACY_PROGID}_backup"
!macroend

!macro customUnInstall
  ; The incoming installer refreshes the registration in place during upgrades.
  ${IfNot} ${isUpdated}
    !insertmacro eachReyadExtension unregisterReyadExtension
    DeleteRegKey SHELL_CONTEXT "${REYAD_CLASSES}\${REYAD_PROGID}"
    DeleteRegKey SHELL_CONTEXT "${REYAD_CLASSES}\${REYAD_LEGACY_PROGID}"
    DeleteRegKey SHELL_CONTEXT "${REYAD_APPLICATION}"
    DeleteRegKey SHELL_CONTEXT "${REYAD_CAPABILITIES}"
    DeleteRegKey /ifempty SHELL_CONTEXT "Software\ReyadMDX"
    DeleteRegValue SHELL_CONTEXT "Software\RegisteredApplications" "ReyadMDX"
    System::Call 'shell32::SHChangeNotify(i, i, p, p) v (0x08000000, 0, 0, 0)'
  ${EndIf}
!macroend

