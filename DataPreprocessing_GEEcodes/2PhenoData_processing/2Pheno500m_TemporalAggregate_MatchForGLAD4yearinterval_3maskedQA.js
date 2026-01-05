/***
 * The average method is used in temporal aggregation
 * // TRY1：Phenological metrics without applying quality control: without_maskedQA
   // TRY2：Phenological metrics with applying quality control:：  maskedQA_Overall_AND_Detailed
   // TRY3：Phenological metrics with applying quality control:    maskedQA_Overall
 */

   var startYear = 2001;
var endYear = 2020;
var years = [];
for (var i = startYear; i <= endYear; i++) {
  years.push(i);
}
console.log(years);

// Define maskregion
var roi = 'Global';
var method_Aggre = 'Mean';
// var method_Aggre = 'P30'; // var percentile = 30;

// var QA_mask = 'without_maskedQA';
// var QA_mask = 'maskedQA_Overall';
var QA_mask = 'maskedQA';

var LcProduct = 'GLADLC';

var Scale_in = 500;
var Scale_out = 500;

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
var pheno = 'SOS1';
var PhenCol = ee.ImageCollection.fromImages(years.map(function(year){   
  var infile_Dir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/SpatialAggregate/'+QA_mask;
  var infile_name = pheno+'_agg'+method_Aggre+'_'+Scale_in+'m_'+year+'_'+roi;
  var infile_Path = infile_Dir +'/' + infile_name;
  var metricIMG = ee.Image(infile_Path);
  // metricIMG = metricIMG.clip(maskregion)//.toInt16();
  var yearProperty = metricIMG.get('year');
  metricIMG = ee.Algorithms.If(
    ee.Algorithms.IsEqual(yearProperty, null),
    metricIMG.set('year', year),
    metricIMG
  );
  return metricIMG;
}))

// 
print('phenCollection', PhenCol);
Map.addLayer(PhenCol, {}, 'PhenCol');

// 
var startYear_GLAD = 2003;
var endYear_GLAD = 2019;
var years_GLAD = ee.List.sequence(startYear_GLAD, endYear_GLAD, 4);
print('years_GLAD', years_GLAD);
var nyears = years_GLAD.size();
print('nyears', nyears);

// ## way1
years_GLAD.evaluate(function(years){
  years.map(function(year){
    // print("year", year);
    var PhenCol_filtered = PhenCol.filter(ee.Filter.calendarRange(year-3, year, 'year')).select(pheno);
    // var count = PhenCol_filtered.count();
    // print('count', count);
    // Map.addLayer(count, {}, 'count');
    // var Mask_count = count.gt(1);
    // ### MEAN OR MEDIAN????    
    var metricIMG = PhenCol_filtered.reduce(ee.Reducer.mean()).rename(pheno);
    // var metricIMG = PhenCol_filtered.reduce(ee.Reducer.median()).rename(pheno);
    
    // metricIMG = metricIMG.updateMask(Mask_count);
    metricIMG = metricIMG.toInt16();
    print('metricIMG', metricIMG);
    // var yearBand = metricIMG.multiply(0).add(year).toInt16().rename('year');
    // metricIMG = metricIMG.addBands(yearBand);  
    // print('metricIMG', metricIMG);
    // Map.addLayer(metricIMG, {}, 'metricIMG');
    
    // ## Export majority500 to Asset
    var outfile_Dir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/TemporalAggregate/'+QA_mask;
    var outfile_name = pheno+'_agg'+method_Aggre+'_forGLADLC_'+Scale_out+'m_'+year+'_'+roi;
    var outfile_Path = outfile_Dir +'/' + outfile_name;
    // print('outfile_Dir', outfile_Dir);
    print('outfile_name', outfile_name);
    // print('outfile_Path', outfile_Path);
    
    Export.image.toAsset({
        image: metricIMG,
        description: outfile_name,
        assetId: outfile_Path,
        region: maskregion,
        crs: 'EPSG:4326',
        scale: Scale_out,        
        maxPixels: 1e13
    });
    
  });
})