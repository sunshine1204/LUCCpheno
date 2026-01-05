/***
 * 
 */


// https://github.com/gee-community/ee-palettes
var palettes = require('users/gena/packages:palettes');
// var palette = palettes.colorbrewer.BrBG[7].reverse();//colorbrewer.PiYG 
var palette = palettes.colorbrewer.PiYG[11].reverse();//colorbrewer.BrBG: 3,4,5,6,7,8,9,10,11; PiYG; BrBG

// var snazzy = require("users/aazuspan/snazzy:styles");
// snazzy.addStyle("https://snazzymaps.com/style/132/light-gray", "Grayscale");
var point = ee.Geometry.Point([33.8927, -2.6326]); //
print('point', point.coordinates());

var roi = 'Global';;

var pheno = 'SOS1';

var LcProduct = 'GLADLC';
// 
//  ## need to change
// var QA_mask = 'without_maskedQA';
// var QA_mask = 'maskedQA_Overall';
var QA_mask = 'maskedQA';

var method_Aggre = 'Mean';
// var method_Aggre = 'P30'; // var percentile = 30;

// # Need to change!!!
var Scale_in = 500; //
var Scale_out = 500;//500

// #####################################################
var startYear = 2003;
var endYear = 2019;
var years = [];

for (var i = startYear; i <= endYear; i+= 4) {
  years.push(i);
}
console.log(years);
// var years = ee.List.sequence(startYear, endYear);

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
// ### Define maskregion
// Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style({color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1}), {}, 'maskregion', false);
// Map.addLayer(maskregion, {}, 'maskregion');


// ###################### Calculation ##################################
// ## GLAD temporal aggregate
function get_Pheno_SingleYear_GLADinterval(year, QA_mask){
  var infile_Dir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/TemporalAggregate/'+QA_mask;
  var infile_name = pheno+'_agg'+method_Aggre+'_forGLADLC_'+Scale_in+'m_'+year+'_'+roi;
  var infile_Path = infile_Dir +'/' + infile_name;
  var metricIMG = ee.Image(infile_Path);//.clip(maskregion).toInt16();//.int16()
  var yearProperty = metricIMG.get('year');
  metricIMG = ee.Algorithms.If(
    ee.Algorithms.IsEqual(yearProperty, null),
    metricIMG.set('year', year),
    metricIMG
  );
  return ee.Image(metricIMG);
}
// 
var Pheno_startyear = get_Pheno_SingleYear_GLADinterval(startYear, QA_mask).select(pheno);
var Pheno_endyear   = get_Pheno_SingleYear_GLADinterval(endYear, QA_mask).select(pheno);
print('Pheno_startyear', Pheno_startyear);
print('Pheno_endyear', Pheno_endyear);

// #########################################################################
// 1.1 PhenoDiff @500m
var PhenoDiff = Pheno_endyear.subtract(Pheno_startyear);
PhenoDiff = PhenoDiff.toInt16();
print('PhenoDiff', PhenoDiff);
Map.addLayer(PhenoDiff, {}, 'PhenoDiff');
// ## Extract LSP slope value at one single point
var PhenoDiff_point = Extract_pixelVals_from_Image(PhenoDiff, point, Scale_in);
print('PhenoDiff_point', PhenoDiff_point);

// ## Rule out #1, updateMask
// PhenoDiff = PhenoDiff.updateMask(Pheno_startyear.gt(0).and(Pheno_endyear.gt(0)));
// Map.addLayer(PhenoDiff3km, {}, 'PhenoDiff3km');

// ### Export IMAGE ##################################
// ### Export way1: to Asset
var outFileDir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/LSPdiff';
var outFileName = pheno+'Diff_'+Scale_out+'m_'+startYear+'_'+endYear+'_'+LcProduct+'_'+roi+'_'+QA_mask;//
var outFilePath = outFileDir + '/'+ outFileName;
print('outFilePath', outFilePath);

Export.image.toAsset({
    image: PhenoDiff,
    description: outFileName,
    assetId: outFilePath,
    region: maskregion,
    scale: Scale_in,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});

// #########################################################################
// # FrequencyHistogram
var chart = ui.Chart.image.histogram({
  image: PhenoDiff,
  region: maskregion,
  scale: Scale_out,
  maxPixels: 1e13
}); 
print(chart);

// ## frequency histogram  for Greenup_1 
var hist = ee.Dictionary(PhenoDiff.reduceRegion({
  // reducer: ee.Reducer.histogram(null, 1, null),
  // reducer: ee.Reducer.histogram(),
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: maskregion,
  scale: Scale_out,
  maxPixels: 1e13
})); //.get('SOS1')

print('Histogram of Greenup Start Dates:', hist);
var bucketMean = hist.get('bucketMeans');
// Bin/Interval	Count/Frequency
var histogram = hist.get('histogram');
// print('bucketMeans', );
// print('histogram', );
// Export.table.toDrive({
//   collection: ee.FeatureCollection(ee.Feature(null, hist)),
//   description: 'Greenup_Histogram',
//   fileFormat: 'CSV'
// });

// var length1 = list1.size();
// var length2 = list2.size();
// print('List1 size:', length1);
// print('List2 size:', length2);

// var features = ee.FeatureCollection(
//   ee.List.sequence(0, list1.size().subtract(1)).map(function(index) {
//     var value1 = list1.get(index);
//     var value2 = list2.get(index);
//     return ee.Feature(null, {'List1': value1, 'List2': value2});
//   })
// );
// print('FeatureCollection with List1 and List2:', features);
// Export.table.toDrive({
//   collection: features,
//   description: 'List_Export',
//   fileFormat: 'CSV'
// });

// ###################### MAP ##################################
var slope_visParams = {min: -10, max: 10, palette: palette};
// palette: ['brown', 'white', 'blue']; var palette = ['red', 'white', 'green'];
Map.addLayer(PhenoDiff, slope_visParams, pheno+'_Diff');
addLegend(slope_visParams, pheno+'_Diff');

// Map.addLayer(maskregion, {}, 'maskregion');
var styles1 = {color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1};
Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style(styles1), {}, 'maskregion');

Map.addLayer(point, {color: 'blue'}, "point");
// Map.centerObject(maskregion, 10);
// Map.centerObject(point, 12);
Map.setOptions('SATELLITE');

////////////////////////////// Functions /////////////////////////////////
// ## Extrac the pixel values from an image
function Extract_pixelVals_from_Image(image, geometry, scale){
  scale = scale || 30;
  return ee.Image(image).reduceRegion({
      reducer: ee.Reducer.mean(),
      // crs: 'EPSG:4326',
      geometry: geometry,
      scale: scale,
      maxPixels: 1e13,
      // bestEffort: true, 
      tileScale: 16
  });
}

function addLegend(viz, legendTitle){
  // set position of panel
    var legend = ui.Panel({
      style: {
        position: 'bottom-left',
        padding: '8px 15px'
      }
    });
    
 
    // Create legend title
    var legendTitle = ui.Label({
      value: legendTitle,
      style: {
        fontWeight: 'bold',
        fontSize: '18px',
        margin: '0 0 4px 0',
        padding: '0'
        }
    });
    // Add the title to the panel
    legend.add(legendTitle); 
    
    // create the legend image
    var lon = ee.Image.pixelLonLat().select('latitude');
    var gradient = lon.multiply((viz.max-viz.min)/100.0).add(viz.min);
    var legendImage = gradient.visualize(viz);
    
    // create text on top of legend
    var panel = ui.Panel({
        widgets: [
          ui.Label(viz['max'])
        ],
      });
    
    legend.add(panel);
      
    // create thumbnail from the image
    var thumbnail = ui.Thumbnail({
      image: legendImage, 
      params: {bbox:'0,0,10,100', dimensions:'10x200'},  
      style: {padding: '1px', position: 'bottom-center'}
    });
    
    // add the thumbnail to the legend
    legend.add(thumbnail);
    
    // create text on top of legend
    var panel = ui.Panel({
        widgets: [
          ui.Label(viz['min'])
        ],
      });
    
    legend.add(panel);
    
    Map.add(legend);
}