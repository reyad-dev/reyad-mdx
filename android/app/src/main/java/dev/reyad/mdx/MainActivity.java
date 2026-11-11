package dev.reyad.mdx;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.widget.FrameLayout;

import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final String HOME = ORIGIN + "/assets/reader/index.html";
    private static final int OPEN = 1, SAVE = 2;
    private WebView webView;
    private JavaScriptReplyProxy bridge;
    private boolean ready, dirty;
    private Intent queuedIntent;
    private int pickerId;
    private JavaScriptReplyProxy pickerReply;
    private String saveContent;
    private boolean saveExport;
    private final List<JSONObject> queuedEvents = new ArrayList<>();
    private final Set<String> grantedDocuments = new HashSet<>();
    private final ExecutorService files = Executors.newSingleThreadExecutor();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) saveExport = state.getBoolean("saveExport");
        for (android.content.UriPermission permission : getContentResolver().getPersistedUriPermissions()) {
            grantedDocuments.add(permission.getUri().toString());
        }
        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        FrameLayout container = new FrameLayout(this);
        container.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(container);
        // targetSdk 35 uses edge-to-edge: keep controls above system bars and IME.
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebChromeClient(new WebChromeClient());
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!ORIGIN.equals(request.getUrl().getScheme() + "://" + request.getUrl().getHost())) {
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
                WebResourceResponse response = loader.shouldInterceptRequest(request.getUrl());
                if (response != null) {
                    response.setResponseHeaders(Collections.singletonMap("Content-Security-Policy",
                            "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                            "img-src 'self' data:; font-src 'self'; connect-src 'self'; " +
                            "frame-src 'none'; base-uri 'none'; form-action 'none'"));
                    return response;
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame()) openExternal(request.getUrl().toString());
                return true;
            }
        });
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            new AlertDialog.Builder(this).setMessage(R.string.webview_required)
                    .setPositiveButton(android.R.string.ok, (d, w) -> finish()).show();
            return;
        }
        WebViewCompat.addWebMessageListener(webView, "ReyadAndroid", Collections.singleton(ORIGIN),
                (view, message, sourceOrigin, isMainFrame, reply) -> {
                    if (!isMainFrame || !ORIGIN.equals(sourceOrigin.toString())) return;
                    try { handle(new JSONObject(message.getData()), reply); }
                    catch (Exception error) { Toast.makeText(this, error.getMessage(), Toast.LENGTH_SHORT).show(); }
                });
        queuedIntent = getIntent();
        webView.loadUrl(HOME);
    }

    private JSONObject result(Object... values) {
        JSONObject json = new JSONObject();
        try {
            for (int i = 0; i < values.length; i += 2) json.put((String) values[i], values[i + 1]);
        } catch (JSONException impossible) { throw new IllegalArgumentException(impossible); }
        return json;
    }

    private void respond(JavaScriptReplyProxy reply, int id, JSONObject value) {
        runOnUiThread(() -> {
            if (!isFinishing() && !isDestroyed()) reply.postMessage(result("id", id, "result", value).toString());
        });
    }

    private void event(String name, Object value) {
        JSONObject payload = result("event", name, "data", value);
        if (ready && bridge != null && !isFinishing()) {
            bridge.postMessage(payload.toString());
        } else queuedEvents.add(payload);
    }

    private void handle(JSONObject message, JavaScriptReplyProxy reply) throws JSONException {
        int id = message.getInt("id");
        JSONArray args = message.getJSONArray("args");
        switch (message.getString("action")) {
            case "ready":
                bridge = reply; ready = true;
                respond(reply, id, result("ok", true));
                for (JSONObject event : queuedEvents) bridge.postMessage(event.toString());
                queuedEvents.clear();
                consumeIntent(queuedIntent); queuedIntent = null;
                break;
            case "set-dirty":
                dirty = args.getBoolean(0); respond(reply, id, result("ok", true)); break;
            case "set-title":
                setTitle(args.getString(0) + " — ReyadMDX"); respond(reply, id, result("ok", true)); break;
            case "close-now": finish(); break;
            case "open-external":
                openExternal(args.getString(0)); respond(reply, id, result("ok", true)); break;
            case "print":
                ((PrintManager) getSystemService(PRINT_SERVICE)).print("ReyadMDX",
                        webView.createPrintDocumentAdapter("ReyadMDX"), null);
                respond(reply, id, result("ok", true)); break;
            case "open-file":
            case "save-file-as":
                if (pickerReply != null) { respond(reply, id, result("ok", false, "canceled", true)); break; }
                boolean save = message.getString("action").equals("save-file-as");
                Intent intent = new Intent(save ? Intent.ACTION_CREATE_DOCUMENT : Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                // Providers often report mdx/mkd as octet-stream; don't hide these files.
                intent.setType(save ? (args.getString(0).endsWith(".html") ? "text/html" : "text/plain") : "*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                if (save) {
                    intent.putExtra(Intent.EXTRA_TITLE, args.getString(0)); saveContent = args.getString(1);
                    saveExport = args.getString(0).endsWith(".html");
                    // Keep pending output outside the Activity Bundle (documents can be large).
                    try (OutputStream draft = openFileOutput("pending-save", MODE_PRIVATE)) {
                        draft.write(saveContent.getBytes(StandardCharsets.UTF_8));
                    } catch (Exception error) { respond(reply, id, result("ok", false, "error", error.toString())); break; }
                }
                pickerReply = reply; pickerId = id;
                try { startActivityForResult(intent, save ? SAVE : OPEN); }
                catch (ActivityNotFoundException error) {
                    pickerReply = null; saveContent = null;
                    respond(reply, id, result("ok", false, "error", "No document provider installed"));
                }
                break;
            case "save-file": {
                String uri = args.getString(0), content = args.getString(1);
                if (!grantedDocuments.contains(uri)) { respond(reply, id, result("ok", false, "readOnly", true)); break; }
                files.execute(() -> {
                    try { writeDocument(Uri.parse(uri), content); respond(reply, id, result("ok", true, "path", uri)); }
                    catch (Exception error) { respond(reply, id, result("ok", false, "readOnly", true, "error", error.toString())); }
                });
                break;
            }
            case "read-path": {
                String uri = args.getString(0);
                if (!grantedDocuments.contains(uri)) { respond(reply, id, result("ok", false, "error", "Unsupported path")); break; }
                files.execute(() -> {
                    try { respond(reply, id, readDocument(Uri.parse(uri))); }
                    catch (Exception error) { respond(reply, id, result("ok", false, "error", error.toString())); }
                });
                break;
            }
            default: respond(reply, id, result("ok", false, "error", "Unknown action"));
        }
    }

    private String displayName(Uri uri) {
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) return cursor.getString(0);
            } catch (Exception ignored) { }
        }
        String path = uri.getLastPathSegment();
        return path == null ? "document.md" : path.substring(path.lastIndexOf('/') + 1);
    }

    private JSONObject readDocument(Uri uri) throws Exception {
        String scheme = uri.getScheme();
        if (!"content".equals(scheme) && !"file".equals(scheme)) throw new IllegalArgumentException("Unsupported URI");
        String name = displayName(uri);
        if (!name.toLowerCase(java.util.Locale.ROOT).matches(".*\\.(md|markdown|mdown|mkd|mdx|txt)$")) {
            throw new IllegalArgumentException("Supported files: md, markdown, mdown, mkd, mdx, txt");
        }
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalArgumentException("Cannot read document");
            byte[] buffer = new byte[8192]; int count;
            while ((count = input.read(buffer)) != -1) {
                if (output.size() + count > 16 * 1024 * 1024) throw new IllegalArgumentException("Document exceeds 16 MB");
                output.write(buffer, 0, count);
            }
            String content = output.toString(StandardCharsets.UTF_8.name());
            if (content.startsWith("\uFEFF")) content = content.substring(1);
            return result("ok", true, "path", uri.toString(), "name", name, "content", content);
        }
    }

    private void writeDocument(Uri uri, String content) throws Exception {
        try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) throw new IllegalArgumentException("Cannot write document");
            output.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    @Override protected void onActivityResult(int request, int code, Intent data) {
        super.onActivityResult(request, code, data);
        if (request != OPEN && request != SAVE) return;
        JavaScriptReplyProxy reply = pickerReply;
        int id = pickerId;
        String content = saveContent;
        pickerReply = null; saveContent = null;
        if (code != RESULT_OK || data == null || data.getData() == null) {
            if (reply != null) respond(reply, id, result("ok", false, "canceled", true));
            deleteFile("pending-save"); return;
        }
        Uri uri = data.getData();
        grantedDocuments.add(uri.toString());
        try {
            int grantedFlags = 0;
            if ((data.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0) grantedFlags |= Intent.FLAG_GRANT_READ_URI_PERMISSION;
            if ((data.getFlags() & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) != 0) grantedFlags |= Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            if (grantedFlags != 0) getContentResolver().takePersistableUriPermission(uri, grantedFlags);
        } catch (SecurityException ignored) { /* Some providers grant only session access. */ }
        files.execute(() -> {
            try {
                if (request == SAVE) {
                    String output = content;
                    if (output == null) {
                        try (InputStream draft = openFileInput("pending-save"); ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                            byte[] bytes = new byte[8192]; int count;
                            while ((count = draft.read(bytes)) != -1) buffer.write(bytes, 0, count);
                            output = buffer.toString(StandardCharsets.UTF_8.name());
                        }
                    }
                    writeDocument(uri, output);
                    deleteFile("pending-save");
                    JSONObject saved = result("ok", true, "path", uri.toString(), "name", displayName(uri), "content", output, "exportOnly", saveExport);
                    if (reply != null) respond(reply, id, saved);
                    else runOnUiThread(() -> event("saved-path", saved));
                } else {
                    JSONObject opened = readDocument(uri);
                    if (reply != null) respond(reply, id, opened);
                    else runOnUiThread(() -> event("open-path", opened));
                }
            } catch (Exception error) {
                android.util.Log.w("ReyadMDX", "Document operation failed", error);
                JSONObject failed = result("ok", false, "error", error.toString());
                if (reply != null) respond(reply, id, failed);
                else runOnUiThread(() -> event(request == SAVE ? "saved-path" : "open-path", failed));
            }
        });
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent);
        if (ready) consumeIntent(intent); else queuedIntent = intent;
    }

    private void consumeIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (uri == null && intent.getCharSequenceExtra(Intent.EXTRA_TEXT) != null) {
                event("open-path", result("ok", true, "name", "shared-text.md", "content", intent.getCharSequenceExtra(Intent.EXTRA_TEXT).toString()));
                return;
            }
        }
        if (uri == null) return;
        Uri document = uri;
        grantedDocuments.add(document.toString());
        files.execute(() -> {
            JSONObject value;
            try { value = readDocument(document); }
            catch (Exception error) { value = result("ok", false, "error", error.toString()); }
            JSONObject completed = value;
            runOnUiThread(() -> event("open-path", completed));
        });
    }

    private void openExternal(String url) {
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme()) && !"mailto".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException ignored) { Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show(); }
    }

    @Override public void onBackPressed() {
        if (!dirty) { super.onBackPressed(); return; }
        new AlertDialog.Builder(this).setTitle(R.string.app_name).setMessage(R.string.unsaved)
                .setPositiveButton(R.string.save, (d, w) -> event("menu", "save-then-close"))
                .setNegativeButton(R.string.discard, (d, w) -> finish())
                .setNeutralButton(R.string.cancel, null).show();
    }

    @Override protected void onDestroy() {
        files.shutdown();
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        super.onDestroy();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        state.putBoolean("saveExport", saveExport);
        super.onSaveInstanceState(state);
    }
}
