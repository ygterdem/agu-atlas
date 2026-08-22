#!/usr/bin/env python3
"""
Yerel önizleme sunucusu.

    python serve.py            -> http://127.0.0.1:8899
    python serve.py 9000       -> başka port

Neden düz "python -m http.server" değil?
Onun yanıtlarında Cache-Control başlığı yok; tarayıcı da bu durumda JS/CSS
dosyalarını kendi kafasına göre önbellekte tutuyor. Dosyayı değiştiriyorsun
ama sayfayı yenileyince eski hâli geliyor. Bu sunucu her yanıta "no-store"
ekliyor, yani düz F5 bile her zaman en son hâli getiriyor.

Sadece yerel geliştirme içindir; GitHub Pages'te kullanılmaz.
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # Tarayıcı yine de "değişti mi?" diye sorarsa 304 dönmeyelim;
        # her zaman dosyanın tamamını gönderelim.
        self.headers.replace_header("If-Modified-Since", "") \
            if "If-Modified-Since" in self.headers else None
        if "If-None-Match" in self.headers:
            del self.headers["If-None-Match"]
        return super().send_head()

    def log_message(self, fmt, *args):
        # 200'leri susturup sadece hataları göster; konsol temiz kalsın.
        msg = fmt % args
        if " 200 " in msg or " 304 " in msg:
            return
        sys.stderr.write("%s\n" % msg)


# Windows'ta .js bazen text/plain olarak eşleşiyor; elle sabitle.
NoCacheHandler.extensions_map.update({
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json",
    ".svg": "image/svg+xml",
})


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), NoCacheHandler) as httpd:
        print("Atlas yerel sunucu calisiyor (onbellek kapali)")
        print("  Harita      : http://127.0.0.1:%d/" % PORT)
        print("  Duzenleyici : http://127.0.0.1:%d/editor.html" % PORT)
        print("Durdurmak icin Ctrl+C")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDurduruldu.")
