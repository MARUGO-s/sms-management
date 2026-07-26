"use client";

import { Crop, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type MediaAspect = "1:1" | "4:5" | "9:16" | "16:9";

export type MediaCropConfig = {
  aspect: MediaAspect;
  positionX: number;
  positionY: number;
  zoom: number;
};

export const defaultMediaCrop: MediaCropConfig = {
  aspect: "9:16",
  positionX: 50,
  positionY: 50,
  zoom: 100,
};

const aspectOptions: Array<{
  id: MediaAspect;
  label: string;
  description: string;
  width: number;
  height: number;
}> = [
  { id: "1:1", label: "1:1", description: "正方形", width: 1080, height: 1080 },
  { id: "4:5", label: "4:5", description: "縦投稿", width: 1080, height: 1350 },
  { id: "9:16", label: "9:16", description: "リール", width: 1080, height: 1920 },
  { id: "16:9", label: "16:9", description: "横動画", width: 1920, height: 1080 },
];

type MediaEditorProps = {
  fileName: string;
  previewUrl: string;
  value: MediaCropConfig;
  onClose: () => void;
  onSave: (value: MediaCropConfig) => void;
};

export default function MediaEditor({
  fileName,
  previewUrl,
  value,
  onClose,
  onSave,
}: MediaEditorProps) {
  const [draft, setDraft] = useState(value);
  const target = useMemo(
    () => aspectOptions.find((option) => option.id === draft.aspect)!,
    [draft.aspect],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="media-editor-backdrop" role="presentation">
      <section
        aria-labelledby="media-editor-title"
        aria-modal="true"
        className="media-editor-dialog"
        role="dialog"
      >
        <header className="media-editor-header">
          <div>
            <p className="eyebrow">Media Crop</p>
            <h3 id="media-editor-title">動画をクロップ</h3>
            <span>{fileName}</span>
          </div>
          <button
            aria-label="動画編集を閉じる"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="media-editor-body">
          <div className="media-editor-stage">
            <div
              className="media-crop-frame"
              style={{ aspectRatio: `${target.width} / ${target.height}` }}
            >
              <video
                controls
                muted
                playsInline
                src={previewUrl}
                style={{
                  objectPosition: `${draft.positionX}% ${draft.positionY}%`,
                  transform: `scale(${draft.zoom / 100})`,
                }}
              />
            </div>
            <p>
              出力 {target.width} x {target.height}px / MP4
            </p>
          </div>

          <div className="media-editor-controls">
            <fieldset>
              <legend>縦横比</legend>
              <div className="aspect-segmented">
                {aspectOptions.map((option) => (
                  <button
                    aria-pressed={draft.aspect === option.id}
                    className={draft.aspect === option.id ? "active" : ""}
                    key={option.id}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        aspect: option.id,
                      }))
                    }
                    type="button"
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="media-range">
              <span>
                横位置
                <strong>{draft.positionX}%</strong>
              </span>
              <input
                max="100"
                min="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    positionX: Number(event.target.value),
                  }))
                }
                type="range"
                value={draft.positionX}
              />
            </label>

            <label className="media-range">
              <span>
                縦位置
                <strong>{draft.positionY}%</strong>
              </span>
              <input
                max="100"
                min="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    positionY: Number(event.target.value),
                  }))
                }
                type="range"
                value={draft.positionY}
              />
            </label>

            <label className="media-range">
              <span>
                拡大
                <strong>{draft.zoom}%</strong>
              </span>
              <input
                max="200"
                min="100"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    zoom: Number(event.target.value),
                  }))
                }
                type="range"
                value={draft.zoom}
              />
            </label>
          </div>
        </div>

        <footer className="media-editor-actions">
          <button
            className="ghost-button"
            onClick={() => setDraft(defaultMediaCrop)}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} />
            初期値に戻す
          </button>
          <button
            className="primary-button"
            onClick={() => onSave(draft)}
            type="button"
          >
            <Crop aria-hidden="true" size={16} />
            クロップ設定を保存
          </button>
        </footer>
      </section>
    </div>
  );
}
