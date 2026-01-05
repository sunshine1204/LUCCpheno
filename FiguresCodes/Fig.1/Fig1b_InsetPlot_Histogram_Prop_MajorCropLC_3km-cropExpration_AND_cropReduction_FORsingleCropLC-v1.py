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
from matplotlib.ticker import ScalarFormatter
plt.rcParams['font.family'] = 'Arial'

def rebuild_data(df, val, count):    
    dataList = df.apply(lambda row: [row[val]] * int(row[count]), axis=1) 
    dataArray = np.concatenate(dataList.values)
    return dataArray

###################### Cropland Gain 
inDir = r"D:\LUCC_LSP\Results\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Histogram\Histogram_Prop_For_MajorCropLC_RENEW-20250126"
infile1 = 'propHist_3km_CropExpansion_Global.csv'
inpath1 = os.path.join(inDir, infile1)
df1 = pd.read_csv(inpath1, usecols = ['BucketMean', 'Frequency'])
print('Histogram size', df1['Frequency'].sum())
data1 = rebuild_data(df1, 'BucketMean', 'Frequency')
data1 = data1.astype(np.float32)

mean1 = np.mean(data1)
print('mean1', mean1)

###################### Cropland Loss 
infile2 = 'propHist_3km_CropReduction_Global.csv'
inpath2 = os.path.join(inDir, infile2)
df2 = pd.read_csv(inpath2, usecols = ['BucketMean', 'Frequency'])
print('Histogram size', df2['Frequency'].sum())
data2 = rebuild_data(df2, 'BucketMean', 'Frequency')
data2 = data2.astype(np.float32)
mean2 = np.mean(data2)
print('mean2', mean2)

# bin edges
bin_edges = [0, 0.02, 0.04, 0.08, 0.16, 1]

###### gain
colors1 = ['#f5f500', '#f5b800', '#f57a00', '#f53d00', '#f50000']
###### loss
colors2 = ['#1be0f2', '#27caf2', '#3286ed', '#274ee8', '#0220e3']

# bin_edges
bin_labels = ['[0-0.02)', '[0.02-0.04)', '[0.04-0.08)', '[0.08-0.16)', '[0.16-1.0)']
num_bins = len(bin_edges) - 1

# !!!! bins: including the rightmost edge, allowing for non-uniform bin widths.
counts1, _ = np.histogram(data1, bins=bin_edges)
counts2, _ = np.histogram(data2, bins=bin_edges)

x = np.arange(num_bins)
width = 0.8  # Set the column widths to be the same

# Create the main canvas
fig, (ax1, ax2) = plt.subplots(nrows=1, ncols= 2, figsize=([1.6, 1.5]), dpi= 300, sharey=True, constrained_layout= False)#, sharey=True,sharex=True, 
fig.subplots_adjust(top=0.865,
                    bottom=0.046,
                    left=0.131,
                    right=0.986,
                    hspace=0.175,
                    wspace=0.115)
# scientific notation
formatter = ScalarFormatter(useMathText=True)
formatter.set_scientific(True)
formatter.set_powerlimits((0, 0)) 

# Cropland Gain
# bars1 = ax1.bar(x, counts1, width=width, color=colors1, edgecolor='black')
bars1 = ax1.bar(
    x, counts1, width=width,
    color=colors1,
    edgecolor='gray',
    linewidth=0.5
)
# ax1.set_title("Cropland gain")
ax1.set_xticks(x)
# ax1.set_xticklabels(bin_labels, rotation=45)
ax1.set_xticklabels([])
ax1.set_ylabel("Frequency", fontsize=10)
ax1.yaxis.set_major_formatter(formatter)
ax1.spines['top'].set_visible(False)
ax1.spines['right'].set_visible(False)
ax1.tick_params(axis='x', which='both', bottom=False, top=False)

# Cropland Loss
# bars2 = ax2.bar(x, counts2, width=width, color=colors2, edgecolor='black')
bars2 = ax2.bar(
    x, counts2, width=width,
    color=colors2,
    edgecolor='gray', 
    linewidth=0.5           
)
# ax2.set_title("Cropland loss")
ax2.set_xticks(x)
ax2.set_xticklabels([])
# ax2.set_xticklabels(bin_labels, rotation=45)
ax2.yaxis.set_major_formatter(formatter)
ax2.spines['top'].set_visible(False)
ax2.spines['right'].set_visible(False)
ax2.tick_params(axis='x', which='both', bottom=False, top=False)

# ax.set_aspect('auto')
# ax.set_ylabel('')
for ax in [ax1, ax2]:
    ax.set_yticks([0, 2e5, 4e5, 6e5, 8e5])
    # ax.set_yticklabels(['0', '2', '4', '6', '8'])
    # ax.ticklabel_format(axis='y', style='scientific', scilimits=(0, 0))
    ax.yaxis.offsetText.set_position((0, 0.7))
    ax.yaxis.offsetText.set_ha('center')
    ax.yaxis.offsetText.set_fontsize(8)
    # ax.yaxis.offsetText.set_color('gray')

# outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig1\Renew-20250520'
outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig1\Renew-20250913'

os.makedirs(outDir, exist_ok= True)

outfile = 'propHist_3km_CropChange_Global.png'
outpath = os.path.join(outDir, outfile)

plt.savefig(outpath, dpi=300, transparent=True)

# plt.tight_layout()
plt.show()


