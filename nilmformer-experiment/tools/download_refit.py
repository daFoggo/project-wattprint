"""Download CLEAN_REFIT_081116.7z (~490MB) and extract CLEAN_HOUSE*.csv into data/REFIT/RAW_DATA_CLEAN/."""
import pathlib
import requests
import py7zr

URL = "https://pureportal.strath.ac.uk/files/62090184/CLEAN_REFIT_081116.7z"
OUT = pathlib.Path("data/REFIT/RAW_DATA_CLEAN")
OUT.mkdir(parents=True, exist_ok=True)
archive = pathlib.Path("/tmp/refit.7z")

with requests.get(URL, stream=True, timeout=60) as r:
    r.raise_for_status()
    with open(archive, "wb") as f:
        for chunk in r.iter_content(1 << 20):
            f.write(chunk)

with py7zr.SevenZipFile(archive) as z:
    z.extractall("/tmp/refit")
for p in pathlib.Path("/tmp/refit").rglob("CLEAN_HOUSE*.csv"):
    p.rename(OUT / p.name.replace("CLEAN_HOUSE", "CLEAN_House"))
print(sorted(x.name for x in OUT.iterdir()))
