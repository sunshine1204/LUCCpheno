# -*- coding: utf-8 -*-
"""
Created on Wed Feb  5 18:02:35 2025

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
import matplotlib.cm as cm
import seaborn as sns
# sns.set(style="whitegrid")
plt.rcParams['font.family'] = 'Arial'

def Outlier_array_IQR(x, fillvalue = -9999.0):
    """
    Compute average of the 25-th to 75-th percentile of the data across specified zonal.
    Spatial statistics after the removal of outliers by quantiles
    """
    if not type(x) is np.ndarray:
        x = np.asarray(x, dtype=np.float32)
    #x1 = x1[~np.isnan(x)]
    x_flatten = x[x!=fillvalue]
    #remove Outliers
    upper_quartile, lower_quartile = np.percentile(x_flatten, [75, 25])
    IQR = (upper_quartile - lower_quartile)
    
    #from scipy.stats import iqr
    #x1= x.copy()
    #x1= np.where(x!=fillvalue, x1, np.nan)
    #IQR = iqr(x1, nan_policy='omit')
    
    lower_range = lower_quartile - (1.5 * IQR)
    upper_range = upper_quartile + (1.5 * IQR)
    #maxv = np.max(x_flatten)
    #minv = np.min(x_flatten)
    valid_mask = np.logical_and(x <= upper_range, x >= lower_range)
    x_masked = np.where(valid_mask, x, fillvalue)
    return x_masked # IQR, lower_range, upper_range,  minv, maxv

### !!! Need to change
Scale = 3
# Scale = 5

TransformLC_Target = 'cropExpansion';
# TransformLC_Target = 'cropReduction';

variable = "Relative_contribution"

# IPCC Reference Regions: ROI Name
rois = ['NWN','NEN','WNA','CNA','ENA','NCA','SCA','CAR','NWS', 'NSA','NES','SAM','SWS','SES','NEU','WCE','EEU','MED','WAF','CAF','NEAF','SEAF','WSAF','ESAF','MDG','WSB','ESB','RFE', 'ECA', 'TIB','WCA','EAS','SAS','SEA','EAU','SAU']

inDir = 'D:\LUCC_LSP\Results\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Histogram'
inFilename = f'Histogram_Contribution_zonalStas_{TransformLC_Target}_FOR_IPCC_referenceRegion_RENEW-20250126'
data_directory = os.path.join(inDir, inFilename)

# Read CSV
data_list = [] 
medians = []
for i, roi in enumerate(rois):
    file_path = os.path.join(data_directory, f'contribHist_{variable}_{Scale}km_{roi}.csv')    
    
    if not os.path.exists(file_path):
        print(f"File missing：{file_path}, Skip this variable!!!")
        continue
    df = pd.read_csv(file_path, usecols = ['BucketMean', 'Frequency'])
    if 'BucketMean' not in df.columns or 'Frequency' not in df.columns:
        continue
    # Check and handle the Frequency column
    # df = df.dropna(subset=["BucketMean", "Frequency"])  # delete NaN
    
    # rebuild data
    bucket_means = df['BucketMean'].values
    frequencies = np.ceil(df['Frequency']).astype(int)
    
    reconstructed_data = np.repeat(bucket_means, frequencies)    
    # IQR = Q3 - Q1
    # reconstructed_data = reconstructed_data[(reconstructed_data["Value"] >= Q1 - 1.5 * IQR) & (reconstructed_data["Value"] <= Q3 + 1.5 * IQR)]
    if len(reconstructed_data) > 0:
        data_list.append(reconstructed_data)
        medians.append(np.median(reconstructed_data))


fig, ax = plt.subplots(nrows=1, ncols=1, figsize=(8, 2.5),  dpi=300)  # sharex=True, 
fig.subplots_adjust(top=0.9,
                bottom=0.2,
                left=0.074,
                right=0.991,
                hspace=0.2,
                wspace=0.2)
# fig.subplots_adjust(top=0.9,
#                     bottom=0.17,
#                     left=0.044,
#                     right=0.991,
#                     hspace=0.2,
#                     wspace=0.2)

# Define the grade intervals and the corresponding colors
levels = [(0.0, 0.2),
          (0.2, 0.3),
          (0.3, 0.4),
          (0.4, 0.5),
          (0.5, 0.6),
          (0.6, 0.7),
          (0.7, 0.8),
          (0.8, 1.0)]
colors = ['#053061', '#2f77b5', '#88bedb', '#dcebf2', '#fce6d7', '#f09a7a', '#c23936', '#66001f']

box = ax.boxplot(data_list, patch_artist=False, widths=0.5, 
                  showmeans = True, 
                 showcaps = False, showfliers=False, whis=0, 
                 boxprops=dict(linewidth=1.5),  # The width of the lines on the edge of the box
                 whiskerprops=dict(linewidth=0.5),  # The width of the whisker line
                 capprops=dict(linewidth=0.5),  # The line widths at the top and bottom
                 medianprops=dict(linewidth=2) 
                ) 

# Iterate through each box and set the border color
for i, line in enumerate(box['boxes']):
    # print('i', i)
    median_value = medians[i]
    line.set_color('#ff00c3' if median_value >= 0.5 else '#006eff')

# SET xticklabels
ax.set_xticks(range(1, len(rois) + 1))
ax.set_xticklabels(rois, rotation= 45, ha="center", fontsize= 10)

xticklabels = ax.get_xticklabels()
for i, label in enumerate(xticklabels):
    median_value = medians[i]  # Get median
    label.set_color('#ff00c3' if median_value >= 0.5 else '#006eff')

ax.set_yticks(np.arange(0, 1.1, 0.1))
ax.set_yticklabels([f'{i:.1f}' for i in np.arange(0, 1.1, 0.1)])

ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

ax.set_ylabel('Contribution', fontsize= 11)  

ax.axhline(y= 0.5, color='grey', linestyle='--', linewidth=2, zorder = 1) #, label='y=0.5'

if TransformLC_Target == 'cropExpansion':
    ax.text(0.02, 0.95,  "Relative contribution of cropland gain for 36 IPCC regions", fontsize=10, weight='bold', ha='left', va='center', transform=ax.transAxes)
elif TransformLC_Target == 'cropReduction':
    ax.text(0.02, 0.95, "Relative contribution of croland loss for 36 IPCC regions", fontsize=10, weight='bold', ha='left', va='center', transform=ax.transAxes)
    
outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig2\Renew-20250913'
os.makedirs(outDir, exist_ok= True)

outfile = f'Boxplot_contriLUCC_{Scale}km_{TransformLC_Target}_FOR_IPCC6-refRegions.png'
outpath = os.path.join(outDir, outfile)

plt.savefig(outpath, dpi=300)

# plt.tight_layout()
plt.show() 

print(f'{TransformLC_Target} @ {Scale}km')
