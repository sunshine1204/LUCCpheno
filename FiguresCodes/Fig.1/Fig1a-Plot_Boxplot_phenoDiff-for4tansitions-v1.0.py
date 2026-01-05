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
import time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import seaborn as sns
# print(sns.__version__)
# pip install --upgrade seaborn
from matplotlib import cm
# plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.family"] = "Arial"

# ---------------------------------------------------------------------------
def filter_array_QR(x, fillvalue = -9999.0):
    if not type(x) is np.ndarray:
        x = np.asarray(x, dtype=np.float32)
    x_flatten = x[x != fillvalue]
    upper_quartile, lower_quartile = np.percentile(x_flatten, [90, 10])
    valid_mask = np.logical_and(x <= upper_quartile, x >= lower_quartile)
    x_masked = np.where(valid_mask, x, np.nan)
    return x_masked

def rebuild_data(df, val, count):    
    dataList = df.apply(lambda row: [row[val]] * int(row[count]), axis=1) # Make sure count is an integer
    dataArray = np.concatenate(dataList.values)  # Merge all the lists to avoid explicit loops
    return dataArray

timeStart = time.time()

inDir = r"D:\LUCC_LSP\Results\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Histogram\Hist_LSPdiff_500m\Histogram_LSPdiff_500m_RENEW-20250126\Histogram_LSPdiff_500m_aggMajor_maskedQA_Overall_RENEW"

types = ['cropExpansion', 'cropStable', 'cropReduction', 'nonCropStable', 'ALL']
labels = ['cropland gain', 'stable cropland', 'cropland loss', 'non-cropland', 'All']

colors = ['#F5F500', '#F5B800', '#F57A00', '#F53D00', '#F50000']

file_paths = ['Hist_SOS1diff_500m_'+itype+'_Global.csv' for itype in types]

type_list = []
mean_list = []
std_list = []
count_list = []

# Read four CSV files and put their contents into mean_list
for idx, infile in enumerate(file_paths):
    inpath = os.path.join(inDir, infile)
    df = pd.read_csv(inpath, usecols = ['system:index', 'BucketMean', 'Frequency'])
    print(idx+1, types[idx])
    print('Histogram size = ', df['Frequency'].sum())
    data = rebuild_data(df, 'BucketMean', 'Frequency')
    data = np.float32(data)
    # print(data)
    # mean = data.mean()
    mean = np.median(data)
    print('mean = ', mean)
    data = filter_array_QR(data, fillvalue = -9999.0)
    
    data = data[~np.isnan(data)]
    non_nan_count = np.count_nonzero(~np.isnan(data))
    print('Size_outliersRemoved = ', non_nan_count)
    mean = np.median(data)
    print('Mean_outliersRemoved = ', mean)
    std = np.std(data)
    print('Std_outliersRemoved = ', std)
    
    print()
    
    type_list.append(idx)
    mean_list.append(mean)
    std_list.append(std)
    count_list.append(non_nan_count)
    
combined_df = pd.DataFrame(list(zip(type_list, mean_list, std_list, count_list)), columns=['type', 'mean', 'std', 'count'])
combined_df.dtypes
combined_df['type'] = combined_df['type'].astype(np.int16)
combined_df.dtypes

# sns.set(style='whitegrid')
# facecolor = '#eaeaf2'
fig, ax = plt.subplots(nrows=1, ncols= 1, figsize=([6, 2]), dpi= 300, constrained_layout= False)#, sharey=True,sharex=True, 
# , facecolor=facecolor

fig.subplots_adjust(top=0.875,
                    bottom=0.215,
                    left=0.11,
                    right=0.945,
                    hspace=0.2,
                    wspace=0.2)
x = range(len(labels))

means = combined_df['mean']
stds = combined_df['std']
# Customize the color of each category
colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00']

alpha = 0.8

# Draw the vertical error bar and set it to different colors
for xi, mean, std, color in zip(x, means, stds, colors):
    y_top = mean + std
    y_bot = mean - std
    
    # average point
    ax.scatter(xi, mean,
               color=color,         # fill color
               edgecolor=color,     # border color
               alpha=1.0,
               linewidth=1,
               s=50,
               zorder=3)
    
    # Vertical line of the error bar
    ax.vlines(xi, y_bot, y_top,
              color=color,
              alpha=alpha,
              linewidth=5,
              zorder=2)
    
    # # Round head: upper and lower ends
    ax.scatter([xi, xi], [y_top, y_bot],
                color=color,
                edgecolor=color,
                alpha=alpha,
                # linewidth=5,
                s=15,
                zorder=3)
    # Add the mean text (retaining one decimal place)
    ax.text(xi, y_top + 5, f'{mean:.1f}',
            ha='center', va='bottom',
            fontsize=10, color=color, alpha=alpha)

# plt.show() 
    
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

ax.set_ylim([-20, 25])

texts = [t.get_text()  for t in ax.get_xticklabels()]
print('texts', texts)  # texts ['1', '2', '3', '4', '5']

ax.set_xticks(x) 
# ax.set_xticklabels(labels)
# ax.set_xticklabels(['CropExpansion', 'All'])
# ax.set_xticklabels(['0.00-0.02', '0.02-0.04', '0.04-0.08', '0.08-0.16', '0.16-1.00'], fontsize=12, rotation= 30)

labels_two_line = [label.replace(' ', '\n') for label in labels]
ax.set_xticklabels(labels, fontsize=9, rotation= 10)
# ax.set_xticklabels(labels_two_line, fontsize=9) #, rotation= 10

# ax.set_aspect('auto')
ax.axhline(0, linewidth= 0.8, color='k', linestyle= "--") # dashdot
ax.set_xlabel('')
ax.set_ylabel('SOS difference (days)', fontsize= 11)

# outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig1\Renew-20250520'
outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig1\Renew-20250913'
os.makedirs(outDir, exist_ok= True)

outfile = 'Boxplot_For_PhenoDiff_500m-FOR4tansitions.png'
outpath = os.path.join(outDir, outfile)

# Save the image and set the resolution to 300 dpi
plt.savefig(outpath, dpi=300, transparent=True)

plt.show()

print('Elasped time: %.1f s'%(time.time() - timeStart))