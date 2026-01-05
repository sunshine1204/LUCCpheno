# -*- coding: utf-8 -*-
"""
Created on Sun Dec 15 16:37:05 2024

@Synopsis:
    python version: 3.7
    platform: win-64

@Description:
    

@Reference:
    
@Author: Jilin Yang (yangjilin_china@163.com) @ LUGC & EOMF

"""
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import seaborn as sns
from matplotlib import cm
import matplotlib.ticker as mticker
plt.rcParams['font.family'] = 'Arial'

# Rebuild data
def rebuild_data(df, val, count):
    dataList = df.apply(lambda row: [row[val]] * int(row[count]), axis=1) 
    dataArray = np.concatenate(dataList.values) 
    return dataArray

Scale = 3
# Scale = 5

TransformLC_Target = 'cropExpansion';
# TransformLC_Target = 'cropReduction';
# 
inDir = r"D:\LUCC_LSP\Results\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Histogram"
inDir = os.path.join(inDir, f'Histogram_Contribution_PhenoDiff_{TransformLC_Target}-RENEW-20251226')
infile = f"contribHist_Relative_contribution_{Scale}km_2003_2019_Global_aggMajor_maskedQA.csv"
inpath = os.path.join(inDir, infile)
df = pd.read_csv(inpath, usecols = ['BucketMean', 'Frequency'])
print('Histogram size', df['Frequency'].sum())
# Rebuild data
bucket_means = df['BucketMean'].values
frequencies = np.ceil(df['Frequency']).astype(int)
data = np.repeat(bucket_means, frequencies)      
# data = rebuild_data(df, 'BucketMean', 'Frequency')

# Calculate the proportion that is greater than or equal to 0.5
prop_ge_05 = np.sum(data >= 0.5) / len(data)

# Calculate cumulative frequency
sorted_data = np.sort(data)
cumulative_freq = np.arange(1, len(data) + 1) / len(data)

# Find the cumulative frequency when the data equals 0.5
threshold = 0.5
cumulative_at_05 = cumulative_freq[np.searchsorted(sorted_data, threshold)]

mean = np.mean(data)
print('mean', mean)

fig, ax1 = plt.subplots(nrows=1, ncols= 1, figsize=([1.6, 1.5]), dpi= 300, constrained_layout= False)#, sharey=True,sharex=True, 

fig.subplots_adjust(top=0.89,
                    bottom=0.179,
                    left=0.189,
                    right=0.798,
                    hspace=0.2,
                    wspace=0.2)
# sns.kdeplot(data)
if TransformLC_Target == 'cropExpansion':
    sns.kdeplot(data, ax=ax1, color= '#3182bd', lw= 1.5, linestyle= '-', bw_adjust= 2.5, fill=True, alpha=0.2, label="Density") #, label="Density", #f53d00
else:
    sns.kdeplot(data, ax=ax1, color= '#3182bd', lw= 1.5, linestyle= '-', bw_adjust= 2, fill=True, alpha=0.2, label="Density") #, label="Density", #7fbf7b,#7b3294

# Create a double Y-axis, with the right axis: cumulative frequency
ax2 = ax1.twinx()
sns.histplot(data, ax= ax2, color= '#f53d00', cumulative=True, stat="density", element="step", bins=30, fill=False, label="Cumulative Frequency")# 
ax2.set_ylabel("Cumulative Frequency", color='red', fontsize=12)
ax2.tick_params(axis='y', labelcolor='red')

# Draw the cumulative frequency horizontal line when data equals 0.5
ax2.axhline(y= cumulative_at_05, xmin= threshold, xmax=1, color="g", linestyle="--", linewidth=1.5)
ax2.axvline(x= threshold, ymin=0, ymax=cumulative_at_05, color="g", linestyle="--", linewidth=1.5)

ax1.spines['top'].set_visible(False)
ax2.spines['top'].set_visible(False)

if TransformLC_Target == 'cropExpansion':    
    ax1.tick_params(axis="y",  colors='#3182bd')
else:    
    ax1.tick_params(axis="y",  colors='#3182bd')

ax2.tick_params(axis="y",  colors="#f53d00")

ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{int(x * 100)}"))
ax2.annotate("%", xy=(1.02, 1.02), xycoords="axes fraction", fontsize=12, color='r')
ax1.set_xlim(0, 1)
ax1.set_ylabel('')

if TransformLC_Target == 'cropExpansion':
    ax1.text(0.5, 0.45,  f"{cumulative_at_05:.2%}", fontsize=10, ha='left', va='top', transform=ax1.transAxes)
else:
    ax1.text(0.5, 0.48,  f"{cumulative_at_05:.2%}", fontsize=10, ha='left', va='top', transform=ax1.transAxes)

# plt.tight_layout()

# outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig2'
outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig2\Renew-20250913'

os.makedirs(outDir, exist_ok= True)

outfile = f'contribHist_Relative_contribution_{Scale}km_2003_2019_Global_aggMajor_maskedQA_{TransformLC_Target}.png'
outpath = os.path.join(outDir, outfile)

plt.savefig(outpath, dpi=300)

plt.show()


