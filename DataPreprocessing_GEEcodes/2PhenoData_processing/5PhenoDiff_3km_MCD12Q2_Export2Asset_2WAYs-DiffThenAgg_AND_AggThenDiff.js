/***
 * 
 * 
*/

var roi = 'Global';

var pheno = 'SOS1';

var LcProduct = 'GLADLC';

// !!!!! method_Aggre1 + method_Aggre2
// var method_Aggre = 'Mean';
var method_Aggre = 'P30'; // percentile = 30;
// var method_Aggre = 'intervalMean';

var QA_mask = 'without_maskedQA';
// var QA_mask = 'maskedQA_Overall';
// var QA_mask = 'maskedQA';

var order_Aggre = 'DiffThenAgg';
// var order_Aggre = 'AggThenDiff';

// # Need to change!!!
var Scale_in = 500; //
var Scale_out = 3000;
// var Scale_out = 5000;
// var Scale_out = 8000;

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


// ###################### MAIN ##################################
// ### WAY1: Diff(@500m)-Then-Agg(from500mTo3km)
if (order_Aggre == 'DiffThenAgg'){
  // 1.1 PhenoDiff @500m
  var inFileDir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/LSPdiff';
  var inFileName = pheno+'Diff_'+Scale_in+'m_'+startYear+'_'+endYear+'_'+LcProduct+'_'+roi+'_'+QA_mask;//
  var inFilePath = inFileDir + '/'+ inFileName;
  print('inFilePath', inFilePath);
  var PhenoDiff500m = ee.Image(inFilePath);
  print('PhenoDiff500m', PhenoDiff500m);
  Map.addLayer(PhenoDiff500m, {}, 'PhenoDiff500m');
    
  // ## Rule out #1, updateMask
  // PhenoDiff500m = PhenoDiff500m.updateMask(Pheno_startyear.gt(0).and(Pheno_endyear.gt(0)));
  // Map.addLayer(PhenoDiff3km, {}, 'PhenoDiff3km');
  
  // ### Spatially Aggregate PhenoDiff from 500m To 3km
  var PhenoDiff3km = imageAggregate(PhenoDiff500m, Scale_out, method_Aggre);
  print('PhenoDiff3km-DiffThenAgg', PhenoDiff3km);
}

// ### WAY2: Agg((@3km)-Then-Diff(@3km)
else if (order_Aggre == 'AggThenDiff'){
  // 
  var get_Pheno3KM_SingleYear_GLADinterval = function(year, Scale_in, method_Aggre, QA_mask){
      var inFileDir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/LSP_AGGRegated'+'/'+QA_mask;
      var inFileName = pheno+'_agg'+method_Aggre+'_'+Scale_in/1000+'km_'+year+'_'+roi;//
      var inFilePath = inFileDir +'/' + inFileName;
      print('inFileDir', inFileDir);
      print('inFileName', inFileName);
      var PhenoDiff3km = ee.Image(inFilePath);
      // PhenoDiff3km = PhenoDiff3km.clip(maskregion).toInt16();//.int16()
      var yearProperty = PhenoDiff3km.get('year');
      PhenoDiff3km = ee.Algorithms.If(
        ee.Algorithms.IsEqual(yearProperty, null),
        PhenoDiff3km.set('year', year), 
        PhenoDiff3km
      );
      return ee.Image(PhenoDiff3km);
  }
  var Pheno_startyear3km = get_Pheno3KM_SingleYear_GLADinterval(startYear, Scale_out, method_Aggre, QA_mask);
  var Pheno_endyear3km   = get_Pheno3KM_SingleYear_GLADinterval(endYear, Scale_out, method_Aggre, QA_mask);
  print('Pheno_startyear3km', Pheno_startyear3km);
  print('Pheno_endyear3km', Pheno_endyear3km);
  // ## Rule out #1, updateMask
  // PhenoDiff500m = PhenoDiff500m.updateMask(Pheno_startyear.gt(0).and(Pheno_endyear.gt(0)));
  // Map.addLayer(PhenoDiff3km, {}, 'PhenoDiff3km');
  
  // 2. PhenoDiff500m @Nominal scale
  var PhenoDiff3km = Pheno_endyear3km.subtract(Pheno_startyear3km);
  print('PhenoDiff3km-AggThenDiff', PhenoDiff3km);
}

// "SOS1_mean"
// "SOS1_stdDev"
PhenoDiff3km = PhenoDiff3km.toInt16();
print('PhenoDiff3km', PhenoDiff3km);
Map.addLayer(PhenoDiff3km, {}, 'PhenoDiff3km');

// #########################################################################
// ### Export way1: to Asset
// var outFileDir = 'projects/ee-clevelandok/assets/LUCC_LSP_Agri/LSP/MCD12Q2/LSPdiff';
var outFileDir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/LSPdiff';
var outFileName = pheno+'Diff_'+Scale_out/1000+'km'+'_agg'+method_Aggre+'_'+startYear+'_'+endYear+'_'+LcProduct+'_'+roi+'_'+QA_mask+'_'+order_Aggre;//
var outFilePath = outFileDir + '/'+ outFileName;
print('outFileDir', outFileDir);
print('outFileName', outFileName);
// print('outFilePath', outFilePath);

Export.image.toAsset({
    image: PhenoDiff3km,
    description: outFileName,
    assetId: outFilePath,
    region: maskregion,
    scale: Scale_out,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});

// ### Export way2: to DRIVE
var outFileDir = 'LSPDiff_'+Scale_out/1000+'km'+'_Mcd12q2_'+roi+'_RENEW';
print('outFileDir', outFileDir);

// PhenoDiff3km SOS1_mean
// "SOS1_mean"
var PhenoDiff3km_Aggre = PhenoDiff3km.select(pheno+'_'+method_Aggre.toLowerCase()).clip(maskregion);
Export.image.toDrive({
  image: PhenoDiff3km_Aggre.unmask(-9999),
  description: pheno+'Diff_'+Scale_out/1000+'km'+'_agg'+method_Aggre+'_'+startYear+'_'+endYear+'_'+LcProduct+'_'+roi+'_'+QA_mask+'_'+order_Aggre,
  folder: outFileDir,
  region: maskregion,
  scale: Scale_out,
  crs: 'EPSG:4326',
  maxPixels: 1e13, 
  fileFormat: 'GeoTIFF'
});

// STD_Diff of PhenoDiff
// "SOS1_stdDev"
var PhenoDiff3km_Std = PhenoDiff3km.select(pheno+'_stdDev').clip(maskregion);
Export.image.toDrive({
  image: PhenoDiff3km_Std.unmask(-9999),
  description: pheno+'Diff_'+Scale_out/1000+'km'+'_Std_'+startYear+'_'+endYear+'_'+LcProduct+'_'+roi+'_'+QA_mask+'_'+order_Aggre,
  folder: outFileDir,
  region: maskregion,
  scale: Scale_out,
  crs: 'EPSG:4326',
  maxPixels: 1e13, 
  fileFormat: 'GeoTIFF'
});

// ###################### MAP ##################################
// Map.addLayer(maskregion, {}, 'maskregion');
var styles1 = {color: 'red', fillColor: '00000000', lineType: 'dashed', width: 1};
Map.addLayer(ee.FeatureCollection(ee.Feature(maskregion)).style(styles1), {}, 'maskregion');

Map.addLayer(point, {color: 'blue'}, "point");
// Map.centerObject(maskregion, 10);
// Map.centerObject(point, 12);
Map.setOptions('SATELLITE');

////////////////////////////// Functions /////////////////////////////////
// ### Aggregate
function imageAggregate(image_srs, Scale_out, method){
  /***
   * Calculate the majority lucc of 100m pixels within each 500m pixel-->majority500
   */
  // slopeIMG = slopeIMG.setDefaultProjection(proj_original);
  image_srs = ee.Image(image_srs);
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