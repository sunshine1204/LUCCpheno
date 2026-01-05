// Define maskregion
var roi = 'Global';

var pheno = 'SOS1';
// 
// 
var startYear = 2003;
var endYear = 2019;
var yearList = ee.List.sequence(startYear, endYear, 4);
print('yearList', yearList);
var nyears = yearList.size();
print('nyears', nyears);
// 
var Scale_in = 3000;
var Scale_out = 3000;
// var Scale_out = 5000;

var LcProduct = 'GLADLC';

// # TransformLC
// var TransformLC_Target = 'cropExpansion';
var TransformLC_Target = 'cropReduction';

var aggregate_WAY = 'aggMajor';
// var aggregate_WAY = 'aggPro70';

// var QA_mask = 'without_maskedQA';
// var QA_mask = 'maskedQA_Overall';
var QA_mask = 'maskedQA';


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

// ###### GLADLC: Contribution 
// ## 1Contribution
var inputDir = 'projects/ee-luccdata/assets/GLADLC/Contribution/'+TransformLC_Target;
var infile_name = 'PhenoDiff_'+Scale_in/1000+'km_'+LcProduct+'_'+startYear+'_'+endYear+'_'+roi+'_'+aggregate_WAY+'_'+QA_mask;
var infile_Path = inputDir +'/' + infile_name;
print('infile_name', infile_name)
var PhenDiff_Contribt = ee.Image(infile_Path).clip(maskregion);
print('PhenDiff_Contribt', PhenDiff_Contribt);
// Map.addLayer(PhenDiff_Contribt, {}, 'PhenDiff_Contribt');

// # Projection info
var proj_orig = PhenDiff_Contribt.projection();
print('nominal proj:', proj_orig);
// # scale info (in meters) 
var Scale_orig = proj_orig.nominalScale();
print('nominal scale:', Scale_orig);

// # 3km
var PhenoDiff_Observed = PhenDiff_Contribt.select('PhenoDiff_Observed');
var PhenoDiff_Climate = PhenDiff_Contribt.select('PhenoDiff_Climate');
var PhenoDiff_LUCC = PhenDiff_Contribt.select('PhenoDiff_LUCC');
var PhenoDiff_Diff = PhenDiff_Contribt.select('PhenoDiff_Diff');
var Relative_contribution = PhenDiff_Contribt.select('Relative_contribution');

print('PhenoDiff_Observed:', PhenoDiff_Observed);
print('PhenoDiff_Climate:', PhenoDiff_Climate);
print('PhenoDiff_LUCC:', PhenoDiff_LUCC);
print('PhenoDiff_Diff', PhenoDiff_Diff); 
print('Relative_contribution', Relative_contribution); 
 
// Map.addLayer(PhenoDiff_Observed, {}, 'PhenoDiff_Observed');
// Map.addLayer(PhenoDiff_LUCC, {}, 'PhenoDiff_LUCC');
// Map.addLayer(PhenoDiff_Climate, {}, 'PhenoDiff_Climate');
// Map.addLayer(PhenoDiff_Diff, {}, 'PhenoDiff_Diff');
// Map.addLayer(Relative_contribution, {}, 'Relative_contribution');


// ###################################
// ### Define a function to calculate the frequency distribution of a single image
var calculateHistogram = function(image, roi_featCol) {
  return roi_featCol.map(function(feature) {
    var roi = feature.geometry();
    // Calculate the frequency distribution of the images in this area
    var histogram = image.reduceRegion({
      reducer: ee.Reducer.histogram(),
      // reducer: ee.Reducer.frequencyHistogram(),
      geometry: roi,
      scale: Scale_in,
      maxPixels: 1e13
    });
    
    // Combine the regional information with the frequency distribution results
    var hist = histogram.get(image.bandNames().get(0)); 
    return feature.set({
      'histogram': hist
    });
  }).filter(ee.Filter.notNull(['histogram']));  // Filter out the areas without frequency distribution
};

// ### Define a function to export the frequency distribution of each region and each image as CSV
var exportHistogram = function(histograms, imageName) {
  histograms.evaluate(function(histogramList) {
    histogramList.features.forEach(function(feature) {
      var hist = feature.properties.histogram;
      var roiField = feature.properties.Acronym;
      // #Extract the histogram data into a dictionary
      var histogramDict = ee.Dictionary(hist);
      print('histogramDict', histogramDict);      
      // #Extract the bucket of the histogram and the corresponding frequency
      var bucketMeans = ee.List(histogramDict.get('bucketMeans'));
      var histogramValues = ee.List(histogramDict.get('histogram'));
      // #To FeatureCollection
      var histogramTable = ee.FeatureCollection(
        bucketMeans.zip(histogramValues).map(function(buckets) {
          buckets = ee.List(buckets);
          return ee.Feature(null, {
            'BucketMean': buckets.get(0),
            'Frequency': buckets.get(1)
          });
        })
      );
      // 
      // print('histogramTable', histogramTable);
      
      var outfile_Dir = 'Histogram_Contribution_zonalStasFOR_IPCC_referenceRegion_'+TransformLC_Target;
      print('outfile_Dir', outfile_Dir);
      
      var outFileName = 'contribHist_'+imageName+'_'+Scale_out/1000+'km_'+roiField;
      print('outFileName', outFileName);
      Export.table.toDrive({
        collection: histogramTable,
        description: outFileName,
        fileFormat: 'CSV',
        folder: outfile_Dir
      });
    });
  });
};


// # 3km
// ### Calculate the frequency distribution histogram of each image
var Hist_climate = calculateHistogram(PhenoDiff_Climate, IPCC_refRegion);
var Hist_lucc = calculateHistogram(PhenoDiff_LUCC, IPCC_refRegion);
var Hist_relcontri = calculateHistogram(Relative_contribution, IPCC_refRegion);
var Hist_diff = calculateHistogram(PhenoDiff_Diff, IPCC_refRegion);

print('Hist_climate', Hist_climate);
print('Hist_lucc', Hist_lucc);
print('Hist_relcontri', Hist_relcontri);
print('Hist_diff', Hist_diff);

var roi_valid = Hist_climate.aggregate_array('Acronym');
print('roi_valid', roi_valid);

// Export the frequency distribution of each image
exportHistogram(Hist_climate, 'PhenoDiff_Climate');
exportHistogram(Hist_lucc, 'PhenoDiff_LUCC');
exportHistogram(Hist_relcontri, 'Relative_contribution');
exportHistogram(Hist_diff, 'PhenoDiff_Diff');