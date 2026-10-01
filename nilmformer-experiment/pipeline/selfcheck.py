"""Sanity check: the vectorised exogenous channels equal the original per-sample computation."""
import numpy as np
import pandas as pd

from pipeline.common import FastNILMDataset
from src.helpers.dataset import NILMDataset

X = np.random.rand(5, 2, 2, 128)
st = pd.DataFrame({"start_date": pd.date_range("2014-03-02 23:50", periods=5, freq="777min")})
exo = ["minute", "hour", "dow", "month"]
a = NILMDataset(X, list_exo_variables=exo, st_date=st, freq="1min")
b = FastNILMDataset(X, st, exo, "1min")
diff = max(np.abs(a[i][0] - b[i][0]).max() for i in range(5))
print("max abs diff:", diff)
assert diff < 1e-5
