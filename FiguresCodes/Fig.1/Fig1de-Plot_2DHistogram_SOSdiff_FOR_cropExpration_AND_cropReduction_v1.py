# -*- coding: utf-8 -*-
"""
Created on Thu Jun 11 12:18:49 2020

@Synopsis: 
    python version: 2.7
    platform: win-32

@Description:
    

@Reference:   
    
@Author: Jilin Yang (yangjilin_china@163.com) @ LUGC & EOMF

"""
import os, sys
import glob
import time
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from osgeo import gdal
import scipy.stats as stats
plt.rcParams["font.family"] = "Arial"
#=================

def Outlier_array_IQR(x, fillvalue = -9999.0):
    """
    
    """
    if not type(x) is np.ndarray:
        x = np.asarray(x, dtype=np.float32)
    #x1 = x1[~np.isnan(x)]
    x_flatten = x[x!=fillvalue]
    #remove Outliers
    # upper_quartile, lower_quartile = np.percentile(x_flatten, [75, 25])
    upper_quartile, lower_quartile = np.percentile(x_flatten, [90, 10])
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


### way 2
#////// Compute average of the 5-th to 95-th percentile of the data across specified zonal
def Outlier_array_IQR2(x, fillvalue = -9999.0):
    """
    Compute average of the 5-th to 95-th percentile of the data across specified zonal.
    Spatial statistics after the removal of outliers by quantiles
    """
    if not type(x) is np.ndarray:
        x = np.asarray(x, dtype=np.float32)
    x_flatten = x[x!=fillvalue]
    upper_quartile, lower_quartile = np.percentile(x_flatten, [75, 25])
    valid_mask = np.logical_and(x <= upper_quartile, x >= lower_quartile)
    x_mask = np.where(valid_mask, x, fillvalue)
    return x_mask

# Plot_Density_phenodiff_vs_cropExpRatio
fillvalue = -9999.0

## Load phenodiffz
InFol_phenodiff = 'D:\LUCC_LSP\Results\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\LSPDiff_3km_Mcd12q2_Global_RENEW-20250126'
file_phenodiff = "SOS1Diff_3km_aggMean_2003_2019_GLADLC_Global_maskedQA_AggThenDiff.tif"

## Load Cropland change
InFol_cropExpRed_Ratio = 'D:\LUCC_LSP\Results\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\TransformLC_MajorCropLC_AND_Prop_GLADLC_RENEW-20250126'
file_cropExpRatio = "Prop_MajorCropLC_3km_CropExpansion_GLADLC_2003_2019_Global.tif"
file_cropRedRatio = "Prop_MajorCropLC_3km_CropReduction_GLADLC_2003_2019_Global.tif"
# Overall_AggThenDiff

## Raster to array --- phenodiff 
phenodiff_path= os.path.join(InFol_phenodiff, file_phenodiff)
phenodiff_ds = gdal.Open(phenodiff_path, gdal.GA_ReadOnly)
if phenodiff_ds is not None: #!=  
    phenodiff_array = phenodiff_ds.GetRasterBand(1).ReadAsArray().astype(np.int16)
    # phenodiff_array = Outlier_array_IQR(phenodiff_array, fillvalue)
else:
    print ("can't open phenodiff: ", phenodiff_path)
    print (sys._getframe().f_code.co_name)
    sys.exit(1)
print ('SHAPE: phenodiff_array', phenodiff_array.shape)

########################### Cropland Expansion ###########################
# Raster to array
cropExpRatio_path= os.path.join(InFol_cropExpRed_Ratio, file_cropExpRatio)
cropExpRatio_ds = gdal.Open(cropExpRatio_path, gdal.GA_ReadOnly)
if cropExpRatio_ds is not None: #!=  
    # cropExpRatio_array = cropExpRatio_ds.GetRasterBand(1).ReadAsArray().astype(np.float64)
    cropExpRatio_array = cropExpRatio_ds.GetRasterBand(1).ReadAsArray().astype(np.float32)
    # cropExpRatio_array = Outlier_array_IQR(cropExpRatio_array, fillvalue)
else:
    print ("can't open cropExpRatio: ", cropExpRatio_path)
    print (sys._getframe().f_code.co_name)
    sys.exit(1)

valid_mask_cropExp = np.logical_and.reduce((cropExpRatio_array != fillvalue, cropExpRatio_array != 0, phenodiff_array != fillvalue))
cropExpRatio_array = np.where(valid_mask_cropExp, cropExpRatio_array, fillvalue)
phenodiff_cropExp_array = np.where(valid_mask_cropExp, phenodiff_array, fillvalue)
# 
cropExpRatio_array = cropExpRatio_array[cropExpRatio_array != fillvalue]
phenodiff_cropExp_array = phenodiff_cropExp_array[phenodiff_cropExp_array != fillvalue]
print ('SHAPE: cropExpRatio_array', cropExpRatio_array.shape)
print ('SHAPE: phenodiff_cropExp_array', phenodiff_cropExp_array.shape)

########################### Cropland Reduction ###########################
# Raster to array
cropRedRatio_path= os.path.join(InFol_cropExpRed_Ratio, file_cropRedRatio)
cropRedRatio_ds = gdal.Open(cropRedRatio_path, gdal.GA_ReadOnly)
if cropRedRatio_ds is not None: #!=  
    cropRedRatio_array = cropRedRatio_ds.GetRasterBand(1).ReadAsArray().astype(np.float32)
else:
    print ("can't open cropRedRatio: ", cropRedRatio_path)
    print (sys._getframe().f_code.co_name)
    sys.exit(1)

valid_mask_cropRed = np.logical_and.reduce((cropRedRatio_array != fillvalue, cropRedRatio_array != 0, phenodiff_array != fillvalue))
cropRedRatio_array = np.where(valid_mask_cropRed, cropRedRatio_array, fillvalue)
phenodiff_cropRed_array = np.where(valid_mask_cropRed, phenodiff_array, fillvalue)
# 
cropRedRatio_array = cropRedRatio_array[cropRedRatio_array != fillvalue]
phenodiff_cropRed_array = phenodiff_cropRed_array[phenodiff_cropRed_array != fillvalue]
print ('SHAPE: cropRedRatio_array', cropRedRatio_array.shape)
print ('SHAPE: phenodiff_cropRed_array', phenodiff_cropRed_array.shape)

#####################################################################################

# Make a 2D hexagonal binning plot of points x, y
# from mpl_toolkits.axes_grid1 import make_axes_locatable
fig, (ax1, ax2) = plt.subplots(nrows=1, ncols= 2, figsize=([6, 2]), dpi= 300, sharey=True, constrained_layout= False) # sharex=True, 
# , facecolor=facecolor
fig.subplots_adjust(top=0.955,
                    bottom=0.206,
                    left=0.148,
                    right=0.961,
                    hspace=0.2,
                    wspace=0.08)

xlim1 = cropExpRatio_array.min(), cropExpRatio_array.max()
ylim1 = phenodiff_cropExp_array.min(), phenodiff_cropExp_array.max()
xlim1 = (0.01, 0.95)
xlim2 = xlim1
ylim2 = ylim1

hb1 = ax1.hexbin(cropExpRatio_array, phenodiff_cropExp_array, gridsize= 100, bins='log', cmap='inferno') #'plasma', 'hot'
hb2 = ax2.hexbin(cropRedRatio_array, phenodiff_cropRed_array, gridsize= 100, bins='log', cmap='inferno') #'plasma', 'hot'

# Perform linear regression
slope1, intercept1, r_value1, p_value1, std_err1 = stats.linregress(cropExpRatio_array, phenodiff_cropExp_array)
slope2, intercept2, r_value2, p_value2, std_err2 = stats.linregress(cropRedRatio_array, phenodiff_cropRed_array)

# Plot the regression line
x_line1 = np.linspace(cropExpRatio_array.min(), cropExpRatio_array.max(), 100)
y_line1 = slope1 * x_line1 + intercept1
# 
x_line2 = np.linspace(cropRedRatio_array.min(), cropRedRatio_array.max(), 100)
y_line2 = slope2 * x_line2 + intercept2

ax1.plot(x_line1, y_line1, color='red')
ax2.plot(x_line2, y_line2, color='red')

ax1.text(0.1, 0.9, f'y = {slope1:.2f}x {intercept1:.2f}\np < 0.01', fontsize= 10, fontweight='bold', fontname='Arial', ha='left', va='top', color='white', transform=ax1.transAxes)          
ax2.text(0.1, 0.9, f'y = {slope2:.2f}x {intercept2:.2f}\np < 0.01', fontsize= 10, fontweight='bold', fontname='Arial', ha='left', va='top', color='white', transform=ax2.transAxes)

ax1.set(xlim= xlim1, ylim= ylim1)
ax1.set_ylabel('SOS difference (days)', fontsize= 10) #  labelpad=0, fontweight="bold"
ax1.set_xlabel('proportion', fontsize= 10) # labelpad=0, fontweight="bold"

ax2.set(xlim= xlim2, ylim= ylim2)
# ax2.set_ylabel('difference', fontsize= 10) #  labelpad=0, fontweight="bold"
ax2.set_xlabel('proportion', fontsize= 10) # labelpad=0, fontweight="bold"

# ax.set_title("With a log color scale")
# cb = fig.colorbar(hb1, ax= ax2, label='counts')

cbar = fig.colorbar(hb1, ax=[ax1, ax2], orientation='vertical') #, shrink=0.8
cbar.set_label("counts")

# plt.tight_layout()

# outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig1\Renew-20250520'
outDir = 'D:\LUCC_LSP\Figures\LUCC_LSP_Agri\TwoPeriods_GLADbased1012\Fig1\Renew-20250913'
os.makedirs(outDir, exist_ok= True)
outfile = '2DHist_SOSdiff_AND_Prop_CropChang_3km_maskedQA_AggThenDiff.png'
outpath = os.path.join(outDir, outfile)
plt.savefig(outpath, dpi=300, transparent=True)

plt.show()#