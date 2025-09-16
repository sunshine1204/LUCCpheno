// 
// 
// 
var startYear = 2003;
var endYear = 2019;
var yearList = ee.List.sequence(startYear, endYear, 4);
print('yearList', yearList);
var nyears = yearList.size();
print('nyears', nyears);

// Define maskregion
var roi = 'Global';

var LcProduct = 'GLADLC';

var Scale_in = 500;
var Scale_out = 500;

var aggregate_WAY1 = 'aggMajor'; 
var aggregate_WAY2 = 'aggThenOl'; //  way1

// 
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

// ###############  Aggregate Landcover from 30m LC to 500m
var inputDir = "projects/ee-luccdata/assets/GLADLC/SpatialAggregate";

// Function to load land cover image for a given year
function getLandCover(year) {  
  var scaleStr = (Scale_in > 1000) ? (Scale_in / 1000 + 'km') : (Scale_in + 'm');
  var assetPath = inputDir + '/' + 
                  LcProduct + '_' + aggregate_WAY1 + '_' + scaleStr + '_' + year + '_' + roi;
  // print('assetPath', assetPath);
  return ee.Image(assetPath).select('LC');
}

var LandCover_start = getLandCover(startYear);
var LandCover_end   = getLandCover(endYear);

print('LandCover_start', LandCover_start);
print('LandCover_end', LandCover_end);

LandCover_start = LandCover_start.where(LandCover_start.eq(0), 2);
LandCover_end = LandCover_end.where(LandCover_end.eq(0), 2);

var TransformLC = LandCover_start.multiply(10).add(LandCover_end).toInt16().rename('MajorLC');
print('TransformLC', TransformLC);
Map.addLayer(TransformLC, {}, 'TransformLC', false);

// # 1. cropExpansion 21
var cropExpansion = TransformLC.eq(21).rename('cropExpansion');
print('cropExpansion', cropExpansion);
Map.addLayer(cropExpansion, {}, 'cropExpansion', false);

// # 2. nonCropStable 22
var nonCropStable = TransformLC.eq(22).rename('nonCropStable');
print('nonCropStable', nonCropStable);
Map.addLayer(nonCropStable, {}, 'nonCropStable', false);

// 3. cropStable 11
var cropStable = TransformLC.eq(11).rename('cropStable');
print('cropStable', cropStable);
Map.addLayer(cropStable, {}, 'cropStable', false);

// 4. cropReduction 12
var cropReduction = TransformLC.eq(12).rename('cropReduction');
print('cropReduction', cropReduction);
Map.addLayer(cropReduction, {}, 'cropReduction', false);
// 
var TransformLC_addband = cropExpansion.addBands(nonCropStable).addBands(cropStable).addBands(cropReduction);
print('TransformLC_addband', TransformLC_addband);
Map.addLayer(TransformLC_addband, imageVisParam, 'TransformLC_addband');

// ## Export majority500 to Asset
var outfile_Dir = 'projects/ee-clevelandok/assets/LUCC_LSP_Agri/LUCC/GLADLC/TransformLC';
var unit = Scale_out >= 1000 ? (Scale_out / 1000 + 'km') : (Scale_out + 'm');
var outfile_name = 'TransformLC_' + unit + '_' + LcProduct + '_' + startYear + '_' + endYear + '_' + roi + '_FOR4TransT_4bands';
var outfile_Path = outfile_Dir +'/' + outfile_name;
print('outfile_name', outfile_name);
print('outfile_Path', outfile_Path);
// 
Export.image.toAsset({
    image: TransformLC_addband,
    description: outfile_name,
    assetId: outfile_Path,
    region: maskregion,
    crs: 'EPSG:4326',
    scale: Scale_out,
     maxPixels: 1e13,
});

// ## Export TransformLC to Asset
// AggregationThenOverlap
var outfile_name2 = 'TransformLC_' + unit + '_' + LcProduct + '_' + startYear + '_' + endYear + '_' + roi + '_' + aggregate_WAY2;
var outfile_Path = outfile_Dir +'/' + outfile_name2;
// print('outfile_Dir', outfile_Dir);
print('outfile_name2', outfile_name2);
print('outfile_Path', outfile_Path);
// 
Export.image.toAsset({
    image: TransformLC,
    description: outfile_name2,
    assetId: outfile_Path,
    region: maskregion,
    crs: 'EPSG:4326',
    scale: Scale_out,
    // crsTransform: projection.transform, 
    maxPixels: 1e13,    
});


var styles1 = {color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1};
Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style(styles1), {}, 'maskregion', false);
