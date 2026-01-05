/***
 * Export4EntireRegion
**/


var startYear = 2003;
var endYear = 2019;
var yearList = ee.List.sequence(startYear, endYear, 4);
print('yearList', yearList);
var nyears = yearList.size();
print('nyears', nyears);
 
// Define maskregion
var roi = 'Global';

var LcProduct = 'GLADLC';

var Scale_in = 30;
var Scale_out = 500;

var aggregate_WAY = 'aggMajor';

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

var styles1 = {color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1};
Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style(styles1), {}, 'maskregion', false);

// ###################### MIAN ################################
yearList.evaluate(function(years){
  years.map(function(year){
    // print("year", year);
    // ## 
    var LCdata_IMG = aggregateIMG_singleYear(year, maskregion);
    var LC = LCdata_IMG.select('LC').toInt16();
    var Prop_crop = LCdata_IMG.select('Prop_crop').toFloat();
    
    // TRY1： The LC type (cropland [1] or non-cropland [2]) with the largest area proportion of the 30m  pixels in the 500m grid (Majority method) is defined as the LC type of that pixel
    if (aggregate_WAY == 'aggMajor'){
      LCdata_IMG = LC.addBands(Prop_crop);
    }
    print('LCdata_IMG', LCdata_IMG)
    // ## Export majority500 to Asset
    var outfile_Dir = 'projects/ee-luccdata/assets/GLADLC/SpatialAggregate';
    
    var outfile_name = (Scale_out >= 1000
                      ? (LcProduct+'_'+(Scale_out/1000)+'km_'+year+'_'+roi+'_Way1'+'_'+aggregate_WAY+'_from30m')
                      : (LcProduct+'_'+Scale_out+'m_'+year+'_'+roi+'_Way1'+'_'+aggregate_WAY+'_from30m'));  
    var outfile_Path = outfile_Dir +'/' + outfile_name;    
    print('outfile_Path', outfile_Path);
    
    Export.image.toAsset({
        image: LCdata_IMG,
        description: outfile_name,
        assetId: outfile_Path,
        region: maskregion,
        crs: 'EPSG:4326',
        scale: Scale_out,
        maxPixels: 1e13        
    });
    
  });
})


// Map.addLayer(LCdata_IC.select('LC'), {}, 'LCdata_IC');
// Map.addLayer(mosaicLandCover, {min: 0, max: 220, palette: 'FFFFFF,00441B'}, 'Mosaic Land Cover');

// #######################################################################
// ######################### Function defination #########################
// 
//
function aggregateIMG_singleYear(year, maskregion){
  // ### 
  var LCdata_IMG = get_LCdata_GLAD(year, maskregion);
  // print('LCdata_IMG1', LCdata_IMG);
  // ### Aggregate 30m to 500m
  LCdata_IMG = imageAggregate(LCdata_IMG);
  // print('LCdata_IMG2', LCdata_IMG);
  LCdata_IMG = LCdata_IMG.select(['LC_mode', 'LC_mean'], ['LC', 'Prop_crop']);
  // print('LCdata_IMG3', LCdata_IMG);
  // var yearBand = LCdata_IMG.select(0).multiply(0).add(year).toInt16().rename('year');
  // LCdata_IMG = LCdata_IMG.addBands(yearBand);
  print('LCdata_IMG', LCdata_IMG);
  return LCdata_IMG.set('year', year);
}

// ###### GLADLC: Global_cropland 
function get_LCdata_GLAD(year, maskregion){
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
  
  var LCdata = LCdata_IC.mosaic();//.clip(maskregion); // Global_cropland_2003_SW/NW/SE/NE
  // LCdata = LCdata.where(LCdata.eq(0), 2);
  LCdata = LCdata.setDefaultProjection('EPSG:4326', null, Scale_orig);
  LCdata = LCdata.rename('LC').toInt16();
  return LCdata//.clip(maskregion);
}

// 
function imageAggregate(image_srs){
  image_srs = ee.Image(image_srs);
  /***
   * Calculate the majority lucc of 100m pixels within each 500m pixel-->majority500
   */
  // atScale
  // 合并多个reducer
  var combinedReducer = ee.Reducer.mode().combine({
      reducer2: ee.Reducer.mean(),
      sharedInputs: true
  })
  // 
  var majority500 = image_srs.reduceResolution({
        reducer: combinedReducer,//'majority' aggragation method; .unweighted()
        // bestEffort: true,
        maxPixels: 65535
      })
      // .reproject({
      //   'crs': 'EPSG:4326', 
      //   'scale': Scale_out
      // });

  return majority500;
}