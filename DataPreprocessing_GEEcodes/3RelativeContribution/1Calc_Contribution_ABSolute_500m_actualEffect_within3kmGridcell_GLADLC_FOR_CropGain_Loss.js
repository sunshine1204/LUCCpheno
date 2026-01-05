/***
 *  cropChange: [cropExpansion OR cropReducion]
 * 
 */
var LcProduct = 'GLADLC';
var pheno = 'SOS1';

var roi = 'Global';

var startYear = 2003;
var endYear = 2019;
var yearList = ee.List.sequence(startYear, endYear, 4);
print('yearList', yearList);
var nyears = yearList.size();
print('nyears', nyears);

// 
var Scale_in = 500;
var Scale_out = 3000;
// var Scale_out = 5000;
// var Scale_out = 8000;

// # TransformLC
var TransformLC_Target = 'cropExpansion';
// var TransformLC_Target = 'cropReduction';

var aggregate_WAY = 'aggMajor';
// var aggregate_WAY = 'aggPro70';

// 物候期质量控制
// var QA_mask = 'without_maskedQA';
// var QA_mask = 'maskedQA_Overall';
var QA_mask = 'maskedQA';

// ###########################################################
if (roi == 'Global'){
  // ## Globe
  var maskregion = 
      /* color: #d63000 */
      /* shown: false */
      ee.Geometry.Polygon(
          [[[-180, 84],//84
            [0, 84],
            [180, 84],
            [180, -58],//-57
            [0, -58],
            [-180, -58],
            [-180, 84]]], null, false);
}

// ###### GLADLC: Global_cropland 
// ## 1TransformLC
var inputDir_L = "projects/ee-luccdata/assets/GLADLC/TransformLC";
var infile_name_L = 'TransformLC_'+Scale_in+'m_'+aggregate_WAY+'_'+LcProduct+'_'+startYear+'_'+endYear+'_'+roi;
var infile_Path_L = inputDir_L +'/' + infile_name_L;
var TransformLC = ee.Image(infile_Path_L).clip(maskregion);
print('TransformLC', TransformLC);
Map.addLayer(TransformLC, {}, 'TransformLC');

// # Projection info
var proj_orig = TransformLC.projection();
print('nominal proj:', proj_orig);
// # scale info (in meters) 
var Scale_orig = proj_orig.nominalScale();
print('nominal scale:', Scale_orig);

// # 1) cropChange: [cropExpansion OR cropReducion]
// var cropExpansion = TransformLC.select(TransformLC_Target);
// print('cropExpansion', cropExpansion);

var cropChange = TransformLC.select(TransformLC_Target);
print('cropChange', cropChange);

// # 2) noncropStable
var nonCropStable = TransformLC.select('nonCropStable');
print('nonCropStable', nonCropStable);

Map.addLayer(cropChange.selfMask(), {palette:['2d13ff']}, TransformLC_Target);
Map.addLayer(nonCropStable.selfMask(), {palette:['1aff69']}, 'nonCropStable');

// ## 2phenoDiff500m
var inputDir_P = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/LSPdiff';
var infile_name_P = pheno+'Diff_'+Scale_in+'m_'+startYear+'_'+endYear+'_'+LcProduct+'_'+roi+'_'+QA_mask;//
var infile_Path_P = inputDir_P + '/'+ infile_name_P;
var phenoDiff = ee.Image(infile_Path_P).clip(maskregion).toInt16();
print('phenoDiff', phenoDiff);
Map.addLayer(phenoDiff, {opacity:1,bands: pheno, min:-100, max:100, palette:["ffffff","ff330d"]}, 'phenoDiff');
// 
var phenoDiff_cropChange = phenoDiff.updateMask(cropChange);
var phenoDiff_nonCropStable = phenoDiff.updateMask(nonCropStable);
print('phenoDiff_cropChange', phenoDiff_cropChange);
print('phenoDiff_nonCropStable', phenoDiff_nonCropStable);

// ###################################
var phenoDiff_addband = phenoDiff_cropChange.addBands(phenoDiff_nonCropStable);
print('phenoDiff_addband:', phenoDiff_addband);

// ### Aggregation method: Median
var phenoDiff_agg = phenoDiff_addband.reduceResolution({
    reducer: ee.Reducer.median(),
    // reducer: ee.Reducer.mean(),
    bestEffort: true,
    maxPixels: 65535
  })
  .reproject({
    'crs': 'EPSG:4326', 
    'scale': Scale_out
  });
print('phenoDiff_agg:', phenoDiff_agg);

phenoDiff_agg = phenoDiff_agg.toFloat();
print('phenoDiff_agg2:', phenoDiff_agg);

// # 3km
var PhenoDiff_Observed = phenoDiff_agg.select(pheno).rename('PhenoDiff_Observed');
var PhenoDiff_Climate = phenoDiff_agg.select(pheno+'_1').rename('PhenoDiff_Climate');

// ## LUCC-related SOS change
var PhenoDiff_LUCC = PhenoDiff_Observed.subtract(PhenoDiff_Climate).rename('PhenoDiff_LUCC');

var PhenoDiff_Diff = PhenoDiff_LUCC.subtract(PhenoDiff_Climate).rename('PhenoDiff_Diff');//.toFloat()

// ## Climate change-related SOS change
PhenoDiff_Climate = PhenoDiff_Climate.updateMask(PhenoDiff_LUCC);

// ### Relative contribution
var Relative_contribution = PhenoDiff_LUCC.abs().divide(PhenoDiff_LUCC.abs().add(PhenoDiff_Climate.abs())).rename('Relative_contribution').toFloat();

var PhenDiff_Contribt = PhenoDiff_Observed
                                    .addBands(PhenoDiff_LUCC)
                                    .addBands(PhenoDiff_Climate)
                                    .addBands(PhenoDiff_Diff)
                                    .addBands(Relative_contribution)
                                    .toFloat();

print('PhenDiff_Contribt', PhenDiff_Contribt);
Map.addLayer(PhenDiff_Contribt, {}, 'PhenDiff_Contribt');
// 
print('PhenoDiff_Observed:', PhenoDiff_Observed);
print('PhenoDiff_Climate:', PhenoDiff_Climate);
print('PhenoDiff_LUCC:', PhenoDiff_LUCC);
print('PhenoDiff_Diff', PhenoDiff_Diff); 
print('Relative_contribution', Relative_contribution);

Map.addLayer(PhenoDiff_Observed, {}, 'PhenoDiff_Observed');
Map.addLayer(PhenoDiff_LUCC, {}, 'PhenoDiff_LUCC');
Map.addLayer(PhenoDiff_Climate, {}, 'PhenoDiff_Climate');
Map.addLayer(PhenoDiff_Diff, {}, 'PhenoDiff_Diff');
Map.addLayer(Relative_contribution, {}, 'Relative_contribution');

// ################################## Export ##################################
// ==============================================================
// ## 1) EXPORT to Asset
var outfile_Dir = 'projects/ee-luccdata/assets/GLADLC/Contribution/'+TransformLC_Target;
var outFileName2 = 'PhenoDiff_'+Scale_out/1000+'km_GLADLC_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
var outfile_path2 = outfile_Dir + '/' +outFileName2;
print('outFileName2', outFileName2);
print('outfile_path2', outfile_path2);

Export.image.toAsset({
    image: PhenDiff_Contribt,
    description: outFileName2,
    assetId: outfile_path2,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});

// ## 2) EXPORT to Drive
var outfile_Dir = 'Contribution_GLADLC_'+TransformLC_Target+'_RENEW';
print('outfile_Dir', outfile_Dir);

// 11111 PhenoDiff_Observed
var outFileName = 'PhenoDiff_Observed_'+Scale_out/1000+'km_GLADLC_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
print('outFileName', outFileName);

Export.image.toDrive({
    image: PhenoDiff_Observed.unmask(-9999),
    description: outFileName, 
    folder: outfile_Dir,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
});

// 22222 PhenoDiff_LUCC
var outFileName = 'PhenoDiff_LUCC_'+Scale_out/1000+'km_GLADLC_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
print('outFileName', outFileName);
Export.image.toDrive({
    image: PhenoDiff_LUCC.unmask(-9999),
    description: outFileName, 
    folder: outfile_Dir,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
});

// 33333 PhenoDiff_Climate
var outFileName = 'PhenoDiff_Climate_'+Scale_out/1000+'km_GLADLC_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
print('outFileName', outFileName);
Export.image.toDrive({
    image: PhenoDiff_Climate.unmask(-9999),
    description: outFileName, 
    folder: outfile_Dir,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
});

// 44444 PhenoDiff_Diff
var outFileName = 'PhenoDiff_Diff_'+Scale_out/1000+'km_GLADLC_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
print('outFileName', outFileName);
Export.image.toDrive({
    image: PhenoDiff_Diff.unmask(-9999),
    description: outFileName, 
    folder: outfile_Dir,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
});

// 55555 Relative_contribution
var outFileName = 'Relative_contribution_'+Scale_out/1000+'km_GLADLC_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
print('outFileName', outFileName);
Export.image.toDrive({
    image: Relative_contribution.unmask(-9999),
    description: outFileName, 
    folder: outfile_Dir,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
});