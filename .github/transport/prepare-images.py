import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps, ImageCms
from io import BytesIO

raw=Path("raw"); dest=Path("gallery");dest.mkdir(exist_ok=True)
rows=json.loads((raw/"result.json").read_text())
for row in rows:
    if not row.get("file"): continue
    src=raw/row["file"]; rel=Path(row["file"]); out=dest/rel
    out.parent.mkdir(exist_ok=True,parents=True)
    try:
        with Image.open(src) as frame:
            original_size=list(frame.size)
            if src.stat().st_size < 135000 or getattr(frame,"is_animated",False):
                shutil.copyfile(src,out)
            else:
                image=ImageOps.exif_transpose(frame)
                if "icc_profile" in image.info and image.mode in ("RGB","CMYK"):
                    try:image=ImageCms.profileToProfile(image,BytesIO(image.info["icc_profile"]),ImageCms.createProfile("sRGB"),outputMode="RGB")
                    except Exception:pass
                if image.mode not in ("RGB","RGBA"):image=image.convert("RGBA" if image.mode=="P" and "transparency" in image.info else "RGB")
                image.thumbnail((2200,2200),Image.Resampling.LANCZOS)
                alt=(dest/rel).with_suffix(".webp")
                image.save(alt,"WEBP",quality=89,method=3)
                if alt.stat().st_size<src.stat().st_size*.86:
                    rel=alt.relative_to(dest);out=alt
                else:
                    if alt!=out:alt.unlink(missing_ok=True)
                    shutil.copyfile(src,out)
            row.update(sourceFileHash=row["sha256"],sourceFileBytes=row["bytes"],sourceDimensions=original_size)
    except Exception:
        shutil.copyfile(src,out)
    data=out.read_bytes()
    row.update(file=rel.as_posix(),sha256=hashlib.sha256(data).hexdigest(),bytes=len(data))
(dest/"result.json").write_text(json.dumps(rows,ensure_ascii=False))
print("Images",sum(bool(r.get("file")) for r in rows),"MB",round(sum(r.get("bytes",0) for r in rows)/1e6),"from",round(sum(r.get("sourceFileBytes",0) for r in rows)/1e6))

