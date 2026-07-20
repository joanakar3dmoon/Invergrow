"""
uploader.py — Sube vídeos a YouTube con metadatos completos
"""

import os
import json
import random
import datetime
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError
from auth import get_youtube_client
from config import *


def build_metadata(title, category, duration_hours=1):
    """Construye los metadatos del vídeo."""
    description = DESCRIPTION_TEMPLATE.format(
        title=title,
        duration=duration_hours,
        channel_url=f"https://www.youtube.com/{CHANNEL_HANDLE}?sub_confirmation=1"
    )

    tags = TAGS.get(category, [])
    # Añadir tags del título como palabras clave extra
    extra = [w.lower() for w in title.split() if len(w) > 4 and w.isalpha()]
    tags = list(set(tags + extra))[:30]  # YouTube permite máx 30 tags

    return {
        "snippet": {
            "title": title[:100],  # máx 100 chars
            "description": description[:5000],  # máx 5000 chars
            "tags": tags,
            "categoryId": "22",  # 22 = People & Blogs, 10 = Music
            "defaultLanguage": "es",
            "defaultAudioLanguage": "es",
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False,
            "madeForKids": False,
        }
    }


def upload_video(video_path, thumbnail_path, title, category, duration_hours=1):
    """
    Sube un vídeo a YouTube.
    Retorna el ID del vídeo subido o None si falla.
    """
    if not os.path.exists(video_path):
        print(f"[uploader] ❌ Vídeo no encontrado: {video_path}")
        return None

    yt = get_youtube_client()
    metadata = build_metadata(title, category, duration_hours)

    print(f"[uploader] 📤 Subiendo: {title}")
    print(f"[uploader]    Archivo: {video_path} ({os.path.getsize(video_path)/1024/1024:.1f} MB)")

    media = MediaFileUpload(
        video_path,
        mimetype="video/mp4",
        resumable=True,
        chunksize=10 * 1024 * 1024  # chunks de 10MB
    )

    try:
        request = yt.videos().insert(
            part=",".join(metadata.keys()),
            body=metadata,
            media_body=media
        )

        # Subida con progreso
        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                pct = int(status.progress() * 100)
                print(f"[uploader]    Progreso: {pct}%")

        video_id = response["id"]
        video_url = f"https://www.youtube.com/watch?v={video_id}"
        print(f"[uploader] ✅ Subido! → {video_url}")

        # Subir thumbnail si existe
        if thumbnail_path and os.path.exists(thumbnail_path):
            try:
                yt.thumbnails().set(
                    videoId=video_id,
                    media_body=MediaFileUpload(thumbnail_path, mimetype="image/jpeg")
                ).execute()
                print(f"[uploader] 🖼️  Thumbnail subido")
            except Exception as e:
                print(f"[uploader] ⚠️  Thumbnail falló (no crítico): {e}")

        # Añadir pantalla final con enlace al canal de techno
        add_endscreen(yt, video_id, duration_hours)

        return video_id, video_url

    except HttpError as e:
        error_content = json.loads(e.content.decode())
        error_reason = error_content.get("error", {}).get("errors", [{}])[0].get("reason", "unknown")
        print(f"[uploader] ❌ Error HTTP {e.resp.status}: {error_reason}")

        if e.resp.status == 403 and "quotaExceeded" in str(e.content):
            print("[uploader] ⚠️  Cuota diaria agotada. Reintenta mañana.")
        return None, None


def log_upload(video_id, video_url, title, category, log_file=None):
    """Registra la subida en el log."""
    if log_file is None:
        log_file = os.path.join(LOGS_DIR, "uploads.json")

    entry = {
        "date": datetime.datetime.now().isoformat(),
        "video_id": video_id,
        "url": video_url,
        "title": title,
        "category": category,
    }

    entries = []
    if os.path.exists(log_file):
        with open(log_file) as f:
            try:
                entries = json.load(f)
            except Exception:
                entries = []

    entries.append(entry)
    with open(log_file, "w") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    print(f"[uploader] 📝 Log guardado → {log_file}")


def add_endscreen(yt, video_id, duration_hours=1):
    """
    Añade pantalla final (últimos 20s) con:
    - Botón suscripción al canal Equilibrio
    - Enlace al canal Joan aka R3DMOON (techno: UCKge0wJ7yEorBZpEI0mcImA)
    """
    TECHNO_CHANNEL_ID = "UCKge0wJ7yEorBZpEI0mcImA"  # @joanakar3dmoon

    duration_ms = int(duration_hours * 3600 * 1000)
    endscreen_start_ms = duration_ms - 20000  # últimos 20 segundos

    try:
        body = {
            "items": [
                {
                    # Botón suscripción
                    "type": "subscribe",
                    "startOffsetMs": str(endscreen_start_ms),
                    "durationMs": "20000",
                    "position": {
                        "type": "corner",
                        "cornerPosition": "bottomLeft"
                    }
                },
                {
                    # Enlace canal techno
                    "type": "channel",
                    "startOffsetMs": str(endscreen_start_ms),
                    "durationMs": "20000",
                    "channelId": TECHNO_CHANNEL_ID,
                    "position": {
                        "type": "corner",
                        "cornerPosition": "bottomRight"
                    }
                }
            ]
        }

        yt.endscreens().insert(
            videoId=video_id,
            body=body
        ).execute()

        print(f"[uploader] 🎬 Pantalla final añadida → canal techno + suscripción")
    except Exception as e:
        print(f"[uploader] ⚠️  Pantalla final falló (no crítico): {e}")


if __name__ == "__main__":
    print("Test de uploader — requiere auth completa")
