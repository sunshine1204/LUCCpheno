/**
 * @Synopsis: 
 * 1) Starting from the 30 m lucc_start30m / lucc_end30m layers (values: 1 = cropland, 2 = non-cropland);
 * 2) At the 30 m scale, construct the transition map trans30 = start*10 + end (11/12/21/22);
 * 3) Aggregate the four transition types within each 500 m grid cell by averaging the 30 m pixel , yielding the area proportion (0-1.0) of each type per 500 m grid;
 * 4) Based on the area proportion of the four transition types, output the dominant transition type (11/12/21/22) for each grid cell, along with the proportion of the dominant type
  
 * @Reference
   
*/ 

var point = ee.Geometry.Point([37.31891, 58.58919]);

// ================== PARAMETERS ==================

// Define maskregion
var roi = 'Global';

var LcProduct = 'GLADLC';
var startYear = 2003;
var endYear = 2019;

var scale30 = 30;
var scale500 = 500;

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
var lucc_start30m = get_GLADLC_LCdata(startYear); //  values: 1=cropland, 2=non-cropland
var lucc_end30m = get_GLADLC_LCdata(endYear);
// print('GLADLC_start', lucc_start30m);
// print('GLADLC_end', lucc_end30m);

// projections
var proj30 = lucc_start30m.projection().atScale(scale30);
var proj500 = proj30.atScale(scale500);
print(proj30.nominalScale(), proj500);

// ================== STEP 1: build 30m transition map (11,12,21,22) ==================
var trans30 = lucc_start30m.multiply(10).add(lucc_end30m).rename('trans30'); // trans30 values: 11,12,21,22
print('trans30', trans30);

// ================== STEP 2: compute per-class proportion at 500m (sum of 30m pixelProp within each 500m cell) = 30m -> 500m ==================
// For each transition class, make a 30m area proportion image (0-1.0) where pixels belonging to that class have pixel area, others masked/0.
var area11_30 = trans30.eq(11).unmask(0);
var area12_30 = trans30.eq(12).unmask(0);
var area21_30 = trans30.eq(21).unmask(0);
var area22_30 = trans30.eq(22).unmask(0);
print('area11_30', area11_30);
Map.addLayer(trans30, {}, 'trans30')

function sumTo500(img30){
  return img30.reduceResolution({
    reducer: ee.Reducer.mean(), //'majority' aggragation method; .unweighted()
    bestEffort: true,
    maxPixels: 65536
  }).reproject({
    crs: proj30.crs(), //'EPSG:4326'
    scale: scale500
    
  });
}
// 
var area11_500 = sumTo500(area11_30).toFloat().rename('prop_500')
    .addBands(ee.Image.constant(11).toInt16().rename('trans_500')).set('trans', 11);
var area12_500 = sumTo500(area12_30).toFloat().rename('prop_500')
    .addBands(ee.Image.constant(12).toInt16().rename('trans_500')).set('trans', 12);
var area21_500 = sumTo500(area21_30).toFloat().rename('prop_500')
    .addBands(ee.Image.constant(21).toInt16().rename('trans_500')).set('trans', 21);
var area22_500 = sumTo500(area22_30).toFloat().rename('prop_500')
    .addBands(ee.Image.constant(22).toInt16().rename('trans_500')).set('trans', 22);


// ## If you want a dominant transition per 500m pixel (based on area within that 500m cell)
var stack500 = ee.ImageCollection([area11_500, area12_500, area21_500, area22_500]);
var max500 = stack500.qualityMosaic('prop_500');
print('stack500', stack500);
print('max500', max500);
print('bandNmae_max500', max500.bandNames());

var dom500_trans = max500.select('trans_500').rename('MajorLC'); // 'dominant_trans'
var dom500_frac = max500.select('prop_500').rename('PropMajorLC'); // 'dominant_frac'

var MajorCropLC_AND_itsProp_500m = dom500_trans.addBands(dom500_frac);
print('MajorCropLC_AND_itsProp_500m', MajorCropLC_AND_itsProp_500m);

var out500 = ee.Image.cat([area11_500, area12_500, area21_500, area22_500, dom500_trans, dom500_frac]);

// Map.addLayer(dom500, {min:11, max:22, palette:['#1b9e77','#d95f02','#7570b3','#e7298a']}, 'Dominant trans 500m');
// Map.addLayer(dom500_frac, {min:0, max:1}, 'Dominant fraction 500m');
Map.addLayer(out500, {min:0, max:1}, 'out500');

// ################################################################
// #### EXPORT to Asset ENTIRELY A SINGLE FILE
var outfile_Dir = 'projects/ee-luccdata/assets/GLADLC/TransformLC';
var unit = scale500 >= 1000 ? (scale500 / 1000 + 'km') : (scale500 + 'm');
var outfile_name = 'TransformLC_' + unit + '_' + LcProduct + '_' + startYear + '_' + endYear + '_' + roi + '_' + aggregate_Order+'_pixelProp';
print('outfile_name', outfile_name);
var outfile_path = outfile_Dir + '/' + outfile_name;
print('outfile_path', outfile_path);

// ## Export toAsset
Export.image.toAsset({
    image: MajorCropLC_AND_itsProp_500m,
    description: outfile_name,
    assetId: outfile_path,    
    region: maskregion,
    scale: scale500,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});

var prop_500 =  area11_500.select(['prop_500'], ['prop11_500'])
      .addBands(area12_500.select(['prop_500'], ['prop12_500']))
      .addBands(area21_500.select(['prop_500'], ['prop21_500']))
      .addBands(area22_500.select(['prop_500'], ['prop22_500']))
      
print('prop_500', prop_500);
Map.addLayer(prop_500, {}, 'prop_500');

var outfile_name2 = 'TransformLC_pixelProp_FOR4transT_' + unit + '_' + LcProduct + '_' + startYear + '_' + endYear + '_' + roi + '_' + aggregate_Order;
print('outfile_name2', outfile_name2);
var outfile_path = outfile_Dir + '/' + outfile_name2;
print('outfile_path', outfile_path);

Export.image.toAsset({
    image: prop_500,
    description: outfile_name2,
    assetId: outfile_path,    
    region: maskregion,
    scale: scale500,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});


Map.addLayer(MajorCropLC_AND_itsProp_500m, {}, 'MajorCropLC_AND_itsProp_500m');
var styles1 = {color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1};
Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style(styles1), {}, 'maskregion');
Map.addLayer(point, {color: 'red'}, 'point');
Map.centerObject(point, 12);

// ######################### Function defination #########################

// ###### GLADLC: Global_cropland 
function get_GLADLC_LCdata(year){
  /***
   * Image collection IDs for each cropland layer:
   * The crop mapping was performed in four-year intervals (2000-2003, 2004-2007, 2008-2011, 2012-2015, and 2016-2019). 
   * There is one cropland layer per epoch (five layers total), with the file name referred to the last year of the interval (2003, 2007, 2011, 2015, and 2019).
   * Data values: 0 – no croplands or no data; 1 – croplands.
   * 2003 "users/potapovpeter/Global_cropland_2003"
   * 2007 "users/potapovpeter/Global_cropland_2007"
   * 2011 "users/potapovpeter/Global_cropland_2011"
   * 2015 "users/potapovpeter/Global_cropland_2015"
   * 2019 "users/potapovpeter/Global_cropland_2019"
   * 
   * Refeerences: 
   * P. Potapov, S. Turubanova, M.C. Hansen, A. Tyukavina, V. Zalles, A. Khan, X.-P. Song, A. Pickens, Q. Shen, J. Cortez. (2021) Global maps of cropland extent and change show accelerated cropland expansion in the twenty-first century. Nature Food. https://doi.org/10.1038/s43016-021-00429-z
     Data visualization using Google Earth Engine Apps
     https://glad.earthengine.app/view/global-cropland-dynamics
  */
  var LCdata_IC = ee.ImageCollection("users/potapovpeter/Global_cropland_"+year);
  
  // # Get projection information from band 1.
  var proj_orig = LCdata_IC.first().projection();
  // print('nominal proj:', proj_orig);  // ee.Number
  // # Get scale (in meters) information from band 1.
  var Scale_orig = proj_orig.nominalScale();
  // print('nominal scale:', Scale_orig);  // ee.Number
  
  var LCdata = LCdata_IC.mosaic();
  LCdata = LCdata.where(LCdata.eq(0), 2);
  LCdata = LCdata.setDefaultProjection('EPSG:4326', null, Scale_orig);
  LCdata = LCdata.rename('LC').toInt16();
  return LCdata//.clip(maskregion);
}