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

