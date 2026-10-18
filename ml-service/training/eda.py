"""Professional exploratory data analysis for the project training dataset.

The script is intentionally non-destructive: it reads the source data and writes
all artifacts below ``training/reports/eda`` (or a directory supplied by
``--output-dir``). It does not infer or transform a modeling target unless the
user explicitly supplies ``--target``.
"""

from __future__ import annotations

import argparse
import base64
import html
import re
from pathlib import Path
from typing import Iterable

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns


DEFAULT_DATASET = Path(__file__).resolve().parent / "dataset" / "M1_combined_monthly_raw.csv"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "reports" / "eda"
MAX_PLOT_FEATURES = 24
MAX_CATEGORIES = 20

sns.set_theme(style="whitegrid", context="notebook")


def _safe_name(value: object) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value)).strip("_") or "unnamed"


def _format_number(value: object) -> str:
    if pd.isna(value):
        return ""
    if isinstance(value, (float, np.floating)):
        return f"{value:,.4g}"
    if isinstance(value, (int, np.integer)):
        return f"{value:,}"
    return str(value)


def _write_csv(frame: pd.DataFrame, path: Path) -> None:
    frame.to_csv(path, index=False, encoding="utf-8")


def _read_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    if path.suffix.lower() != ".csv":
        raise ValueError(f"Unsupported dataset format '{path.suffix}'. Expected a CSV file.")
    return pd.read_csv(path, low_memory=False)


def _date_columns(frame: pd.DataFrame) -> dict[str, pd.Series]:
    parsed: dict[str, pd.Series] = {}
    for column in frame.select_dtypes(include=["object", "string"]).columns:
        values = pd.to_datetime(frame[column], format="mixed", errors="coerce")
        if values.notna().mean() >= 0.8 and values.nunique(dropna=True) > 1:
            parsed[column] = values
    return parsed


def _quality_report(frame: pd.DataFrame, parsed_dates: dict[str, pd.Series]) -> pd.DataFrame:
    rows = []
    for column in frame.columns:
        series = frame[column]
        numeric = pd.api.types.is_numeric_dtype(series)
        non_null = series.dropna()
        unique = int(series.nunique(dropna=False))
        row = {
            "column": column,
            "dtype": str(series.dtype),
            "role": "date-like" if column in parsed_dates else ("numeric" if numeric else "categorical"),
            "rows": len(series),
            "missing_count": int(series.isna().sum()),
            "missing_pct": round(float(series.isna().mean() * 100), 3),
            "unique_values_including_missing": unique,
            "constant": unique <= 1,
            "blank_string_count": int((series.astype("string").str.strip() == "").sum()),
            "negative_count": int((series < 0).sum()) if numeric else 0,
            "zero_count": int((series == 0).sum()) if numeric else 0,
            "min": non_null.min() if numeric and len(non_null) else "",
            "max": non_null.max() if numeric and len(non_null) else "",
            "suspected_outlier_count_iqr": 0,
            "quality_notes": "",
        }
        if numeric and len(non_null) >= 4:
            q1, q3 = non_null.quantile([0.25, 0.75])
            iqr = q3 - q1
            if iqr > 0:
                row["suspected_outlier_count_iqr"] = int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum())
        notes = []
        if row["missing_count"]:
            notes.append("missing values")
        if row["constant"]:
            notes.append("constant/near-zero cardinality")
        if row["blank_string_count"]:
            notes.append("blank strings")
        if row["negative_count"]:
            notes.append("negative numeric values")
        if row["suspected_outlier_count_iqr"]:
            notes.append("IQR outliers")
        row["quality_notes"] = "; ".join(notes)
        rows.append(row)
    return pd.DataFrame(rows)


def _descriptive_statistics(frame: pd.DataFrame) -> pd.DataFrame:
    numeric = frame.select_dtypes(include="number")
    if numeric.empty:
        return pd.DataFrame(columns=["column"])
    result = numeric.describe(percentiles=[0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]).T.reset_index()
    result = result.rename(columns={"index": "column"})
    result["skewness"] = numeric.skew().values
    result["kurtosis"] = numeric.kurtosis().values
    return result


def _missing_values(frame: pd.DataFrame) -> pd.DataFrame:
    missing = frame.isna().sum()
    return pd.DataFrame(
        {
            "column": frame.columns,
            "missing_count": missing.values,
            "missing_pct": (missing.values / max(len(frame), 1) * 100).round(3),
            "non_missing_count": (len(frame) - missing.values),
        }
    ).sort_values(["missing_count", "column"], ascending=[False, True])


def _plot_missing(missing: pd.DataFrame, path: Path) -> None:
    data = missing[missing["missing_count"] > 0].head(MAX_PLOT_FEATURES)
    fig, ax = plt.subplots(figsize=(11, max(4, 0.3 * len(data) + 2)))
    if data.empty:
        ax.text(0.5, 0.5, "No missing values detected", ha="center", va="center", fontsize=14)
        ax.set_axis_off()
    else:
        sns.barplot(data=data, y="column", x="missing_pct", color="#4472C4", ax=ax)
        ax.set_xlabel("Missing values (%)")
        ax.set_ylabel("")
        ax.set_title("Missing-value profile")
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def _plot_distributions(frame: pd.DataFrame, path: Path) -> None:
    columns = list(frame.select_dtypes(include="number").columns)[:MAX_PLOT_FEATURES]
    if not columns:
        return
    ncols = 3
    nrows = int(np.ceil(len(columns) / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(15, 3.1 * nrows))
    axes = np.atleast_1d(axes).ravel()
    for ax, column in zip(axes, columns):
        sns.histplot(frame[column].dropna(), kde=True, ax=ax, color="#5B9BD5")
        ax.set_title(column, fontsize=9)
        ax.tick_params(labelsize=8)
    for ax in axes[len(columns):]:
        ax.set_visible(False)
    fig.suptitle("Numerical feature distributions", y=1.01, fontsize=15)
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)


def _plot_correlation(frame: pd.DataFrame, path: Path) -> None:
    numeric = frame.select_dtypes(include="number")
    if numeric.shape[1] < 2:
        return
    corr = numeric.corr()
    fig_size = min(24, max(10, 0.27 * len(corr) + 5))
    fig, ax = plt.subplots(figsize=(fig_size, fig_size * 0.82))
    sns.heatmap(corr, cmap="vlag", center=0, vmin=-1, vmax=1, ax=ax, xticklabels=True, yticklabels=True)
    ax.set_title("Numerical feature correlation matrix")
    ax.tick_params(axis="x", labelrotation=90, labelsize=7)
    ax.tick_params(axis="y", labelsize=7)
    fig.tight_layout()
    fig.savefig(path, dpi=140, bbox_inches="tight")
    plt.close(fig)


def _plot_relevant_charts(frame: pd.DataFrame, parsed_dates: dict[str, pd.Series], path: Path) -> list[str]:
    numeric = frame.select_dtypes(include="number")
    categorical = [c for c in frame.select_dtypes(exclude="number") if c not in parsed_dates]
    charts: list[str] = []
    if parsed_dates and numeric.shape[1]:
        date_col, dates = next(iter(parsed_dates.items()))
        candidates = [c for c in ["TB_Total_Exports", "TB_Export_Value_Rs_Mn", "CT_World_value_USD"] if c in numeric]
        if not candidates:
            candidates = list(numeric.columns[:3])
        fig, ax = plt.subplots(figsize=(12, 5))
        for column in candidates:
            series = pd.DataFrame({"date": dates, "value": frame[column]}).dropna().sort_values("date")
            if not series.empty:
                ax.plot(series["date"], series["value"], marker=".", linewidth=1.2, label=column)
        ax.set_title(f"Selected numerical trends over {date_col}")
        ax.set_xlabel(date_col)
        ax.legend(loc="best", fontsize=8)
        fig.autofmt_xdate()
        fig.tight_layout()
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        charts.append(path.name)
    elif categorical:
        column = max(categorical, key=lambda c: frame[c].nunique(dropna=True))
        counts = frame[column].astype("string").fillna("<missing>").value_counts().head(MAX_CATEGORIES)
        fig, ax = plt.subplots(figsize=(11, 5))
        sns.barplot(x=counts.values, y=counts.index, color="#70AD47", ax=ax)
        ax.set_title(f"Most frequent values: {column}")
        ax.set_xlabel("Records")
        ax.set_ylabel("")
        fig.tight_layout()
        fig.savefig(path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        charts.append(path.name)
    return charts


def _top_correlations(frame: pd.DataFrame) -> pd.DataFrame:
    numeric = frame.select_dtypes(include="number")
    if numeric.shape[1] < 2:
        return pd.DataFrame(columns=["feature_1", "feature_2", "correlation", "absolute_correlation"])
    corr = numeric.corr()
    pairs = []
    for i, first in enumerate(corr.columns):
        for second in corr.columns[i + 1 :]:
            value = corr.loc[first, second]
            if pd.notna(value):
                pairs.append((first, second, value, abs(value)))
    return pd.DataFrame(pairs, columns=["feature_1", "feature_2", "correlation", "absolute_correlation"]).sort_values(
        "absolute_correlation", ascending=False
    )


def _target_relationships(frame: pd.DataFrame, target: str) -> pd.DataFrame:
    numeric = frame.select_dtypes(include="number")
    if target not in numeric.columns:
        return pd.DataFrame(columns=["feature", "correlation", "absolute_correlation"])
    correlations = numeric.corr()[target].drop(target).dropna()
    return (
        correlations.rename("correlation")
        .to_frame()
        .assign(feature=lambda data: data.index, absolute_correlation=lambda data: data["correlation"].abs())
        .reset_index(drop=True)[["feature", "correlation", "absolute_correlation"]]
        .sort_values("absolute_correlation", ascending=False)
    )


def _html_report(
    frame: pd.DataFrame,
    dataset_path: Path,
    output: Path,
    missing: pd.DataFrame,
    quality: pd.DataFrame,
    stats: pd.DataFrame,
    correlations: pd.DataFrame,
    parsed_dates: dict[str, pd.Series],
    duplicate_count: int,
    target: str | None,
    target_stats: pd.DataFrame,
    target_relationships: pd.DataFrame,
) -> None:
    def table(data: pd.DataFrame, rows: int = 30) -> str:
        display = data.head(rows).copy()
        for column in display.columns:
            display[column] = display[column].map(_format_number)
        return display.to_html(index=False, classes="data-table", border=0, escape=True)

    image_tags = []
    for name, title in [
        ("missing_values.png", "Missing Values"),
        ("distributions.png", "Numerical Distributions"),
        ("correlation_heatmap.png", "Correlation Heatmap"),
        ("other_relevant_charts.png", "Relevant Dataset-Specific Chart"),
    ]:
        image = output / "figures" / name
        if image.exists():
            image_tags.append(f"<h2>{title}</h2><img src='figures/{image.name}' alt='{title}'>")
    top_corr = correlations[correlations["absolute_correlation"] >= 0.9]
    target_note = html.escape(target) if target else "No target supplied; target-specific analysis was not performed."
    date_note = ", ".join(parsed_dates) if parsed_dates else "No date-like column detected."
    target_section = ""
    if target:
        target_section = f"""
<h2>Confirmed target analysis</h2>
<p class="note"><b>{html.escape(target)}</b> is the confirmed target for this report. Correlations are observational associations only; they do not establish causation or forecast performance.</p>
<h3>Target descriptive statistics</h3>{table(target_stats, 5)}
<h3>Numerical feature relationships with the target</h3>{table(target_relationships, 25)}
"""
    report = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>EDA Report - {html.escape(dataset_path.name)}</title>
<style>body{{font-family:Arial,sans-serif;color:#25313b;max-width:1250px;margin:30px auto;line-height:1.45}}
h1{{color:#17365D}} h2{{border-bottom:2px solid #D9E2F3;padding-bottom:5px;margin-top:32px}}
.cards{{display:flex;gap:12px;flex-wrap:wrap}} .card{{background:#EAF2F8;padding:14px 18px;border-radius:6px;min-width:140px}}
.label{{display:block;color:#5b6570;font-size:12px}} .value{{font-size:22px;font-weight:bold}}
img{{max-width:100%;height:auto;border:1px solid #ddd}} .data-table{{border-collapse:collapse;width:100%;font-size:12px;display:block;overflow-x:auto}}
.data-table th,.data-table td{{border:1px solid #ddd;padding:5px;text-align:left}} .data-table th{{background:#D9E2F3}}
.note{{background:#FFF2CC;padding:12px;border-left:4px solid #BF9000}}</style></head><body>
<h1>Exploratory Data Analysis Report</h1><p><b>Dataset:</b> {html.escape(dataset_path.name)}<br>
<b>Generated:</b> {pd.Timestamp.now(tz="UTC").isoformat()}<br><b>Date-like columns:</b> {html.escape(date_note)}</p>
<div class="cards"><div class="card"><span class="label">Rows</span><span class="value">{len(frame):,}</span></div>
<div class="card"><span class="label">Columns</span><span class="value">{frame.shape[1]:,}</span></div>
<div class="card"><span class="label">Numeric</span><span class="value">{len(frame.select_dtypes(include="number").columns):,}</span></div>
<div class="card"><span class="label">Categorical/date</span><span class="value">{len(frame.select_dtypes(exclude="number").columns):,}</span></div>
<div class="card"><span class="label">Duplicate rows</span><span class="value">{duplicate_count:,}</span></div></div>
<h2>Analysis scope</h2><p class="note">Target status: {target_note} This report describes observed data only; it does not clean, transform, or overwrite the source dataset.</p>
{target_section}
<h2>Data quality overview</h2>{table(quality, 77)}
<h2>Missing values</h2>{table(missing, 77)}
<h2>Descriptive statistics</h2>{table(stats, 77)}
<h2>Strongest numerical relationships</h2>{table(correlations, 30)}
<p>{len(top_corr)} feature pairs have absolute correlation at least 0.90 and should be reviewed for multicollinearity or derived-variable duplication.</p>
{''.join(image_tags)}
</body></html>"""
    (output / "EDA_Report.html").write_text(report, encoding="utf-8")


def generate_eda(dataset_path: Path = DEFAULT_DATASET, output_dir: Path = DEFAULT_OUTPUT, target: str | None = None) -> dict[str, object]:
    frame = _read_dataset(dataset_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    figures = output_dir / "figures"
    figures.mkdir(parents=True, exist_ok=True)
    parsed_dates = _date_columns(frame)
    missing = _missing_values(frame)
    quality = _quality_report(frame, parsed_dates)
    stats = _descriptive_statistics(frame)
    correlations = _top_correlations(frame)
    if target is not None:
        if target not in frame.columns:
            raise ValueError(f"Confirmed target column '{target}' was not found in the dataset.")
        if not pd.api.types.is_numeric_dtype(frame[target]):
            raise TypeError(f"Confirmed target column '{target}' must be numeric for target analysis.")
    target_stats = _descriptive_statistics(frame[[target]]) if target else pd.DataFrame()
    target_relationships = _target_relationships(frame, target) if target else pd.DataFrame()
    duplicate_count = int(frame.duplicated().sum())

    _write_csv(missing, output_dir / "missing_values.csv")
    _write_csv(stats, output_dir / "descriptive_statistics.csv")
    _write_csv(quality, output_dir / "data_quality_report.csv")
    if target:
        _write_csv(target_relationships, output_dir / "target_relationships.csv")
    _plot_missing(missing, figures / "missing_values.png")
    _plot_distributions(frame, figures / "distributions.png")
    _plot_correlation(frame, figures / "correlation_heatmap.png")
    _plot_relevant_charts(frame, parsed_dates, figures / "other_relevant_charts.png")
    _write_summary(
        frame, dataset_path, output_dir, missing, quality, stats, correlations,
        parsed_dates, duplicate_count, target, target_relationships
    )
    _html_report(
        frame, dataset_path, output_dir, missing, quality, stats, correlations,
        parsed_dates, duplicate_count, target, target_stats, target_relationships
    )
    return {"dataset": dataset_path.name, "rows": len(frame), "columns": frame.shape[1], "duplicates": duplicate_count}


def _write_summary(
    frame: pd.DataFrame,
    dataset_path: Path,
    output: Path,
    missing: pd.DataFrame,
    quality: pd.DataFrame,
    stats: pd.DataFrame,
    correlations: pd.DataFrame,
    parsed_dates: dict[str, pd.Series],
    duplicate_count: int,
    target: str | None,
    target_relationships: pd.DataFrame,
) -> None:
    missing_nonzero = missing[missing["missing_count"] > 0]
    outliers = quality[quality["suspected_outlier_count_iqr"] > 0].sort_values("suspected_outlier_count_iqr", ascending=False)
    strong = correlations[correlations["absolute_correlation"] >= 0.9].head(15)
    categorical = frame.select_dtypes(exclude="number").columns.tolist()
    date_text = ", ".join(parsed_dates) if parsed_dates else "None detected"
    lines = [
        f"# EDA Summary: `{dataset_path.name}`",
        "",
        "## 1. Dataset Overview",
        f"- Observed shape: **{len(frame):,} rows x {frame.shape[1]:,} columns**.",
        f"- Numerical columns: **{len(frame.select_dtypes(include='number').columns):,}**; non-numerical columns: **{len(categorical):,}**.",
        f"- Date-like columns detected: **{date_text}**.",
        f"- Confirmed target: **`{target}`**." if target else "- Target status: **not confirmed**.",
        "",
        "## 2. Dataset Quality Assessment",
        f"- {int((quality['constant']).sum())} columns are constant or have only one including-missing value.",
        f"- {int((quality['blank_string_count'] > 0).sum())} columns contain blank strings; {int((quality['negative_count'] > 0).sum())} numeric columns contain negative values.",
        f"- See `data_quality_report.csv` for per-column types, cardinality, missingness, zeros, negatives, and IQR flags.",
        "",
        "## 3. Missing-Value Findings",
        f"- {len(missing_nonzero)} of {frame.shape[1]} columns contain missing values; total missing cells: **{int(frame.isna().sum().sum()):,}**.",
    ]
    if not missing_nonzero.empty:
        lines.append("- Columns with missing values: " + ", ".join(f"`{r.column}` ({r.missing_pct:.2f}%)" for r in missing_nonzero.itertuples()))
    else:
        lines.append("- No missing values were observed.")
    lines += [
        "",
        "## 4. Duplicate Analysis",
        f"- Exact duplicate records: **{duplicate_count:,}** ({duplicate_count / max(len(frame), 1) * 100:.2f}% of rows).",
        "",
        "## 5. Distribution Analysis",
        f"- Numerical distribution statistics and skewness are in `descriptive_statistics.csv` for {len(stats):,} numerical columns.",
        "- Histograms and KDE overlays are included only for the first 24 numerical columns to keep the report readable.",
        "",
        "## 6. Outlier Findings",
        f"- IQR screening flagged {int(outliers['suspected_outlier_count_iqr'].sum()):,} cell-level observations across {len(outliers)} numerical columns.",
    ]
    if not outliers.empty:
        lines.append("- Highest IQR flags: " + ", ".join(f"`{r.column}` ({int(r.suspected_outlier_count_iqr)})" for r in outliers.head(10).itertuples()))
    lines += [
        "- IQR flags are screening signals, not automatic errors; time-series seasonality and legitimate extremes require domain review.",
        "",
        "## 7. Correlation Findings",
        "- The strongest pairwise numerical correlations are summarized in the HTML report and are visible in the correlation heatmap.",
    ]
    if strong.empty:
        lines.append("- No pairwise absolute correlation of at least 0.90 was observed.")
    else:
        lines.append("- Pairs with absolute correlation >= 0.90: " + "; ".join(f"`{r.feature_1}` / `{r.feature_2}` ({r.correlation:.3f})" for r in strong.itertuples()))
    if target:
        lines += [
            "",
            "## 7A. Confirmed Target Relationships",
            f"- The confirmed target is `{target}`. It has {int(frame[target].isna().sum())} missing values and {int(frame[target].nunique())} observed unique values.",
            "- Strongest observational numerical associations with the target: "
            + "; ".join(f"`{r.feature}` ({r.correlation:.3f})" for r in target_relationships.head(10).itertuples())
            + ".",
            "- These correlations are univariate, contemporaneous associations and must not be interpreted as causal evidence or as model accuracy.",
        ]
    lines += [
        "",
        "## 8. Important Patterns",
        "- The dataset is structured as monthly observations when the detected date field is used; inspect the time-trend figure for level shifts, seasonality, and missing periods.",
        "- Unit and provenance columns should be interpreted with their paired measures; identical or near-identical source/unit fields can create redundant predictors.",
        "",
        "## 9. Potential Data Leakage Risks",
        "- No target was assumed. If a future target is selected, any feature measured after the prediction cutoff, aggregates containing the target period, or columns derived from the target must be excluded.",
        "- Monthly time ordering implies random train/test splitting may leak future information; use a chronological split after the target and forecast horizon are defined.",
        "- Columns with names indicating totals, exports, prices, or post-period aggregates require business-timestamp confirmation before modeling.",
        "",
        "## 10. Recommended Preprocessing Steps",
        "- Confirm the modeling objective, target, prediction timestamp, forecast horizon, units, and acceptable missingness policy.",
        "- Parse the detected date column explicitly, validate monthly continuity, and use time-aware validation.",
        "- Resolve missing values by feature meaning; do not impute blindly. Validate negative values and IQR flags against domain rules.",
        "- Remove exact duplicates only after confirming they are not repeated legitimate monthly records; retain the raw source unchanged.",
        "",
        "## 11. Recommended Feature Engineering Opportunities",
        "- After target confirmation, consider calendar month/quarter and lag/rolling features computed strictly from prior observations.",
        "- Consider unit-normalized ratios and carefully selected aggregate measures only where their numerator/denominator definitions are known.",
        "- Investigate highly correlated feature groups for documented, domain-informed reduction; do not remove features solely from this EDA.",
        "",
        "## 12. Limitations and Issues Requiring Clarification",
        "- The dataset has no explicit target label in this EDA run.",
        "- Source provenance, unit semantics, and whether all columns are available at prediction time require confirmation.",
        "- IQR outlier detection does not account for seasonality, structural breaks, or domain thresholds.",
        "- This stage intentionally performs no permanent cleaning, preprocessing, feature selection, or model training.",
    ]
    (output / "EDA_Summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate non-destructive EDA reports for a CSV dataset.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Path to the input CSV.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT, help="Directory for EDA artifacts.")
    parser.add_argument("--target", default=None, help="Optional confirmed target column; never inferred automatically.")
    args = parser.parse_args()
    result = generate_eda(args.dataset, args.output_dir, args.target)
    print(f"Generated EDA for {result['dataset']}: {result['rows']} rows x {result['columns']} columns; {result['duplicates']} duplicates.")
    print(f"Reports: {args.output_dir.resolve()}")


if __name__ == "__main__":
    main()
