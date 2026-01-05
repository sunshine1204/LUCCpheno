/**
 * @Synopsis: 
 * 从 30 m 的 lucc_start30m / lucc_end30m（值：1=cropland, 2=non-cropland）出发；
    在 30 m 级别构建转变图 trans30 = start*10 + end（11/12/21/22）；
    按 30 m 像元面积把四类在每个 500 m 网格内求和，得到 500 m 网格内每类的面积（m²）；
    再把 500 m 的面积（m²）汇总到 5 km 网格，算出每格四类的总面积与比例（占该格有效面积的比例）；
    输出每格的主导转变类型（11/12/21/22）以及主导类型的比例（0-1）。
    代码中注意对 masked 像元的处理：masked 的 30 m 像元不会被计入面积（reduceResolution 的 sum 会忽略 masked），这样在计算比例时不会把缺失当作 0 或错误计入总面积。
 * @Reference links
*/

// 
var point = ee.Geometry.Point([37.31891, 58.58919]);

// ================== PARAMETERS ==================
// Define maskregion
var roi = 'Global';

var LcProduct = 'GLADLC';
var startYear = 2003;
var endYear = 2019;

var scale500 = 500;
var scale5k = 3000;
// var scale5k = 5000;
// var scale5k = 8000;

var aggregate_WAY = 'aggMajor';

var aggregate_Order = 'olThenAgg';

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

// ================== INPUTS ==================
var infile_Dir = 'projects/ee-luccdata/assets/GLADLC/TransformLC';
var unit = scale500 >= 1000 ? (scale500 / 1000 + 'km') : (scale500 + 'm');
var infile_name = 'TransformLC_pixelProp_FOR4transT_' + unit + '_' + LcProduct + '_' + startYear + '_' + endYear + '_' + roi + '_' + aggregate_Order;
print('infile_name', infile_name);
var infile_path = infile_Dir + '/' + infile_name;
print('infile_path', infile_path);

var prop_500 = ee.Image(infile_path);
print('prop_500', prop_500);
Map.addLayer(prop_500, {}, 'prop_500');

var prop11_500 = prop_500.select('prop11_500').rename('prop_500');
var prop12_500 = prop_500.select('prop12_500').rename('prop_500');
var prop21_500 = prop_500.select('prop21_500').rename('prop_500');
var prop22_500 = prop_500.select('prop22_500').rename('prop_500');

// projections
var proj500 = prop11_500.projection().atScale(scale500);
var proj5k = proj500.atScale(scale5k);

// ================== STEP 3: aggregate 500m area images to 5km grid (sum areas), then compute proportions ==================
// prop11_500 etc. are in m^2 per 500m pixel. Now sum them within 5km cells to get per-5km total m^2 for each class.
function sumTo5k(img500){
  // treat img500 as source; reduceResolution will sum the pixel values that lie within each 5km cell
  return img500.reduceResolution({
    reducer: ee.Reducer.mean(),
    bestEffort: true,
    maxPixels: 65536
  }).reproject({crs: proj5k.crs(), scale: scale5k});
}

var prop11_5k = sumTo5k(prop11_500).toFloat().rename('prop_5k')
                    .addBands(ee.Image.constant(11).toInt16().rename('trans_5k')).set('trans', 11);
var prop12_5k = sumTo5k(prop12_500).toFloat().rename('prop_5k')
                    .addBands(ee.Image.constant(12).toInt16().rename('trans_5k')).set('trans', 12);
var prop21_5k = sumTo5k(prop21_500).toFloat().rename('prop_5k')
                    .addBands(ee.Image.constant(21).toInt16().rename('trans_5k')).set('trans', 21);
var prop22_5k = sumTo5k(prop22_500).toFloat().rename('prop_5k')
                    .addBands(ee.Image.constant(22).toInt16().rename('trans_5k')).set('trans', 22);

// If you want a dominant transition per 500m pixel (based on area within that 500m cell)
var stack5k = ee.ImageCollection([prop11_5k, prop12_5k, prop21_5k]);
var max5k = stack5k.qualityMosaic('prop_5k');
print('stack5k', stack5k);
print('max5k', max5k);
// 
var dom5k_trans = max5k.select('trans_5k').rename('MajorLC'); // 'dominant_trans'
var dom5k_frac = max5k.select('prop_5k').rename('PropMajorLC'); // 'dominant_frac'

var MajorCropLC_AND_itsProp_5km = dom5k_trans.addBands(dom5k_frac);
print('MajorCropLC_AND_itsProp_5km', MajorCropLC_AND_itsProp_5km);

// ################################################################
// #### EXPORT to Asset ENTIRELY A SINGLE FILE
var outfile_Dir = 'projects/ee-luccdata/assets/GLADLC/TransformLC';

var unit = scale5k >= 1000 ? (scale5k / 1000 + 'km') : (scale5k + 'm');
var outfile_name = 'TransformLC_' + unit + '_' + LcProduct + '_' + startYear + '_' + endYear + '_' + roi + '_From500m_' + aggregate_Order+'_pixelProp';
print('outfile_name', outfile_name);
var outfile_path = outfile_Dir + '/' + outfile_name;
print('outfile_path', outfile_path);

// ## Export toAsset
Export.image.toAsset({
    image: MajorCropLC_AND_itsProp_5km,
    description: outfile_name,
    assetId: outfile_path,    
    region: maskregion,
    scale: scale5k,
    crs: 'EPSG:4326',
    maxPixels: 1e13,

});


// ################################################################
// #### EXPORT to Drive SEPERATELY
var MajorCropLC = MajorCropLC_AND_itsProp_5km.select('MajorLC');
var Prop_MajorCropLC = MajorCropLC_AND_itsProp_5km.select('PropMajorLC');
Prop_MajorCropLC = Prop_MajorCropLC.updateMask(Prop_MajorCropLC.gt(0));

var lcMap = {
  21: 'CropExpansion',
  12: 'CropReduction',
  11: 'CropStable'
};
var folder = 'TransformLC_MajorCropLC_AND_Prop_GLADLC';
print('folder', folder);

for (var TransformLCode in lcMap) {
  var Prop_majorCropLC_singleTrans = Prop_MajorCropLC.updateMask(MajorCropLC.eq(parseInt(TransformLCode)));
  print('Prop_majorCropLC_singleTrans', Prop_majorCropLC_singleTrans);
  
  var conversionLC = lcMap[TransformLCode];
  var outfile_name1 = 'Prop_MajorCropLC_' + unit + '_' + conversionLC + '_GLADLC_' +
                startYear + '_' + endYear + '_' + roi +
                '_From500m_' + aggregate_Order + '_pixelProp';
  print('outfile_name1', outfile_name1);
  
  Export.image.toDrive({
    image: Prop_majorCropLC_singleTrans.unmask(-9999),
    description: outfile_name1,
    folder: folder,
    crs: 'EPSG:4326',
    scale: scale5k,
    region: maskregion,
    maxPixels: 1e13,
    fileFormat: 'GeoTIFF'
  });
}
// ### Merge： 'CropExpansion' + 'CropReduction'
var Prop_majorCropLC_GainLoss = Prop_MajorCropLC.updateMask(MajorCropLC.eq(12).or(MajorCropLC.eq(21)));
print('Prop_majorCropLC_GainLoss', Prop_majorCropLC_GainLoss);
var outfile_name2 = 'Prop_MajorCropLC_' + unit + '_CropGainLoss_GLADLC_' + startYear + '_' + endYear + '_' + roi + '_From500m_' + aggregate_Order+'_pixelProp';
print('outfile_name2', outfile_name2);
// 
Export.image.toDrive({
  image: Prop_majorCropLC_GainLoss.unmask(-9999),
  description: outfile_name2,
  folder: folder,
  crs: 'EPSG:4326',
  scale: scale5k,
  region: maskregion,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
  // formatOptions: {cloudOptimized: true},
});

// ### MAP
var MajorLC_reclass = MajorCropLC.remap([11, 12, 21], [1, 2, 3]);
Map.addLayer(MajorLC_reclass, {min: 1, max: 3, opacity: 1, palette: ["green","red","blue"]}, 'MajorLC_reclass');

Map.addLayer(Prop_MajorCropLC, {"opacity":1,"bands":["PropMajorLC"],"min":-1,"max":-1,"palette":["ff0909"]}, 'Prop_MajorCropLC');
Map.addLayer(MajorCropLC_AND_itsProp_5km, {}, 'MajorCropLC_AND_itsProp_5km');

var styles1 = {color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1};
Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style(styles1), {}, 'maskregion');
Map.addLayer(point, {color: 'red'}, 'point');
Map.centerObject(point, 12);
