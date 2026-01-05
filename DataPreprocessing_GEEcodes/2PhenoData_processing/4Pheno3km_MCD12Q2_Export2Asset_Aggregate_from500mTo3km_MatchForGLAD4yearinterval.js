/***
 * The average method is used in temporal aggregation
 * // TRY1：Phenological metrics without applying quality control: without_maskedQA
   // TRY2：Phenological metrics with applying quality control:：  maskedQA_Overall_AND_Detailed
   // TRY3：Phenological metrics with applying quality control:    maskedQA_Overall
 */

// Define maskregion
var roi = 'Global';

var LcProduct = 'GLADLC';

var pheno = 'SOS1';


// var QA_mask = 'without_maskedQA';
var QA_mask = 'maskedQA_Overall';
var QA_mask = 'maskedQA';

var method_Aggre = 'Mean';
// var method_Aggre = 'P30'; // var percentile = 30;

var Scale_in = 500; // fixed
// # Need to change!!!
var Scale_out = 3000; // need to change
// var Scale_out = 5000; // need to change
// var Scale_out = 8000; // need to change

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

// #### 1 Stack pheno annual data
// #### 1.1 PHENO
// ========================================================================
// ### WAY1: Match with GLADLC data 4-year interval
var startYear_GLAD = 2003;
var endYear_GLAD = 2019;
var years_GLAD = ee.List.sequence(startYear_GLAD, endYear_GLAD, 4);
print('years_GLAD', years_GLAD);
var nyears = years_GLAD.size();
print('nyears', nyears);
// 
years_GLAD.evaluate(function(years){
  years.map(function(year){    
    var infile_Dir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/TemporalAggregate/'+QA_mask;
    var infile_name = pheno+'_aggMean_forGLADLC_'+Scale_in+'m_'+year+'_'+roi;
    var infile_Path = infile_Dir +'/' + infile_name;
    var metricIMG = ee.Image(infile_Path).clip(maskregion).toInt16();
    var yearProperty = metricIMG.get('year');
    metricIMG = ee.Algorithms.If(
      ee.Algorithms.IsEqual(yearProperty, null),
      metricIMG.set('year', year),
      metricIMG
    );
    print('metricIMG', metricIMG);
    
    // ### 1. PhenoDiff500m_To3km_SpatialAggregate: Aggregate 500m to 3km
    var metricIMG_AGGRegated = phenoAggregate_from500mTo3km(metricIMG, method_Aggre);
    metricIMG_AGGRegated = metricIMG_AGGRegated.toInt16();
    print('metricIMG_AGGRegated', metricIMG_AGGRegated);

    var outfile_Dir = 'LSP_'+Scale_out/1000+'km_'+'Mcd12q2_Global_RENEW';
    var outfile_name = pheno+'_'+Scale_out/1000+'km_'+'agg'+method_Aggre+'_'+year+'_'+roi+'_'+QA_mask;//
    print('outfile_Dir', outfile_Dir);
    print('outfile_name', outfile_name);
    
    Export.image.toDrive({
      image: metricIMG_AGGRegated,
      description: outfile_name,
      folder: outfile_Dir,
      region: maskregion,
      scale: Scale_out,
      crs: 'EPSG:4326', 
      maxPixels: 1e13,
      fileFormat: 'GeoTIFF'
    });

  });
})

// Map.addLayer(point, {color: 'red'}, 'point');
// Map.centerObject(point, 12);
// Map.addLayer(LCdata_IC.select('LC'), {}, 'LCdata_IC');
// Map.addLayer(mosaicLandCover, {min: 0, max: 220, palette: 'FFFFFF,00441B'}, 'Mosaic Land Cover');


// ######################### Function defination #########################
// ### Aggregate
function phenoAggregate_from500mTo3km(image_srs, method){
  /***
   * Calculate the majority lucc of 100m pixels within each 500m pixel-->majority500
   */
  // slopeIMG = slopeIMG.setDefaultProjection(proj_original);
  image_srs = ee.Image(image_srs);//.select(band);
  // atScale
  // ## aggragation method
  if (method == 'Mean'){
    var image_Aggregate = image_srs.reduceResolution({
        reducer: ee.Reducer.mean().combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true}),//.unweighted();
        // bestEffort: true,
        maxPixels: 65535
      })
      .reproject({
        'crs': 'EPSG:4326', 
        'scale': Scale_out
      });
  }
  else if (method == 'P30'){
    var image_Aggregate = image_srs.reduceResolution({
        reducer: ee.Reducer.percentile([30]).combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true}),//.unweighted();
        // ee.Reducer.percentile([percentile])
        // bestEffort: true,
        maxPixels: 65535
      })
      .reproject({
        'crs': 'EPSG:4326', 
        'scale': Scale_out
      });
  }
  else if (method == 'intervalMean'){
    var image_Aggregate = image_srs.reduceResolution({
        reducer: ee.Reducer.intervalMean(5, 95).combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true}),//.unweighted();
        // bestEffort: true,
        maxPixels: 65535
      })
      .reproject({
        'crs': 'EPSG:4326', 
        'scale': Scale_out
      });
  }
  
  return image_Aggregate//.toInt16();
}