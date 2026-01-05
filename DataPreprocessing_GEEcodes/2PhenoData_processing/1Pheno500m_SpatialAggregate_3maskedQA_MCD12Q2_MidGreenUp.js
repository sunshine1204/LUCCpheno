/***
 * // TRY1：Phenological metrics without applying quality control: without_maskedQA
   // TRY2：Phenological metrics with applying quality control:：  maskedQA_Overall_AND_Detailed
   // TRY3：Phenological metrics with applying quality control:    maskedQA_Overall
*/

var startYear = 2001;
var endYear = 2020;
var yearList = ee.List.sequence(startYear, endYear);
print('yearList', yearList);
var nyears = yearList.size();
print('nyears', nyears);

// ### Region
var roi = 'Global';

// ### Pheno Metric
var pheno = 'SOS1';

var method_Aggre = 'Mean';
// var method_Aggre = 'P30'; // var percentile = 30;

var QA_mask = 'without_maskedQA';
// var QA_mask = 'maskedQA_Overall';
// var QA_mask = 'maskedQA';

// ### Scale output
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

// ## way1
yearList.evaluate(function(years){
  years.map(function(year){
    // print("year", year);
    var metricIMG = get_annualPhenoMetric_MCD12Q2(year, maskregion, pheno, QA_mask);
    // metricIMG = metricIMG.clip(maskregion).toInt16();   
    var yearProperty = metricIMG.get('year');
    metricIMG = ee.Algorithms.If(
      ee.Algorithms.IsEqual(yearProperty, null),
      metricIMG.set('year', year),
      metricIMG
    );
    
    var metricIMG_AGGRegated = phenoAggregate(metricIMG, method_Aggre); 
    metricIMG_AGGRegated = metricIMG_AGGRegated.toInt16();
    print('metricIMG_AGGRegated', metricIMG_AGGRegated);
    
    // ## Export majority500 to Asset
    var outfile_Dir = 'projects/ee-phenodata/assets/PhenoData/MCD12Q2/SpatialAggregate/'+QA_mask;
    var outfile_name = pheno+'_agg'+method_Aggre+'_'+Scale_out+'m_'+year+'_'+roi+'_MidGreenUp';
    var outfile_Path = outfile_Dir +'/' + outfile_name;
    // print('outfile_Dir', outfile_Dir);
    print('outfile_name', outfile_name);
    // print('outfile_Path', outfile_Path);
        
    Export.image.toAsset({
        image: metricIMG_AGGRegated,
        description: outfile_name,
        assetId: outfile_Path,
        region: maskregion,
        crs: 'EPSG:4326',
        scale: Scale_out,  
        maxPixels: 1e13
    });
    
  });
})

// #######################################################################
// ######################### Function defination #########################
// ## Mask information to exclude those bad observations
function getQABits(image, start, end, newName) {
    // Compute the bits we need to extract.
    var pattern = 0;
    for (var i = start; i <= end; i++) {
      pattern += Math.pow(2, i);
    }
    // Return a single band image of the extracted QA bits, giving the band a new name.
    return image.select([0], [newName])
                  .bitwiseAnd(pattern)
                  .rightShift(start);
}

// 
function get_annualPhenoMetric_MCD12Q2(year, maskregion, newVar, QA_mask){
  // ### get the doy from the MCD12Q2 product---https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MCD12Q2
  // var rawVar = ee.List(['Greenup_1', 'Peak_1', "Dormancy_1", 'Greenup_2', 'Peak_2', "Dormancy_2", 'NumCycles']);
  // var rawVar = ['Greenup_1', 'MidGreenup_1', 'Peak_1', 'MidGreendown_1', 'Dormancy_1', 'Greenup_2', 'MidGreenup_2', 'Peak_2', 'MidGreendown_2', 'Dormancy_2', 'NumCycles'];
  // var newVar = ['SOS1_15p',  'SOS1_50p',     'POS1',   'EOS1_50p',       'EOS1_15p',   'SOS2_15p',  'SOS2_50p',     'POS2',   'EOS2_50p',       'EOS2_15p',   'NumCycles'];
  
  // var rawVar = ['Greenup_1', 'MidGreenup_1', 'Peak_1', 'MidGreendown_1', 'Dormancy_1', 'Greenup_2', 'MidGreenup_2', 'Peak_2', 'MidGreendown_2', 'Dormancy_2', 'NumCycles'];
  // var newVar = ['SOS1_15p',  'SOS1_50p',     'POS1',   'EOS1_50p',       'EOS1_15p',   'SOS2_15p',  'SOS2_50p',     'POS2',   'EOS2_50p',       'EOS2_15p',   'NumCycles'];
  newVar = newVar || 'SOS1';
  QA_mask = QA_mask || 'maskedQA_Overall';
   
  // if (pheno == 'SOS1'){
  //   var rawVar = 'Greenup_1';// 'MidGreenup_1'
  //   var BitNo_START = 0;
  //   var BitNo_END = 1;
  // }
  if (pheno == 'SOS1'){
    var rawVar = 'MidGreenup_1';// 
    var BitNo_START = 2;
    var BitNo_END = 3;
  }
  
  // else if (pheno == 'POS1'){ // Maturity_1
  //   var rawVar = 'Maturity_1';
  //   var BitNo_START = 4;
  //   var BitNo_END = 5;
  // }
  
  else if (pheno == 'POS1'){ // Peak_1
    var rawVar = 'Peak_1';
    var BitNo_START = 6;
    var BitNo_END = 7;
  }
  // else if (pheno == 'POS1'){ // Senescence_1
  //   var rawVar = 'Senescence_1';
  //   var BitNo_START = 8;
  //   var BitNo_END = 9;
  // }
  
  // else if (pheno == 'EOS1'){
  //   var rawVar = 'MidGreendown_1'; // 'MidGreendown_1'
  //   var BitNo_START = 10;
  //   var BitNo_END = 11;
  // }
  
  else if (pheno == 'EOS1'){
    var rawVar = 'Dormancy_1'; // 'MidGreendown_1'
    var BitNo_START = 12;
    var BitNo_END = 13;
  }
  
  // else if (pheno == 'SOS2'){
  //   var rawVar = 'Greenup_2'; // 'MidGreenup_2'
  // }
  // else if (pheno == 'POS2'){
  //   var rawVar = 'Peak_2';
  // }
  // else if (pheno == 'EOS2'){
  //   var rawVar = 'Dormancy_2'; // 'MidGreendown_2'
  // }
  else {
    print('Wrong argument: pheno!')
  }
  // 
  var mcd12q2IMG = ee.ImageCollection('MODIS/061/MCD12Q2').filter(ee.Filter.calendarRange(year, year, 'year')).first();
  // print('mcd12q2IMG:', mcd12q2IMG);
  var metricIMG = ee.Image(mcd12q2IMG).select([rawVar], [pheno]).clip(maskregion);
  // print('metricIMG:', metricIMG);
  // var NumCyclesImg = mcd12q2IMG.select('NumCycles');
  
  // ### 1) QA_Overall_1
  // # QA code for entire segment, cycle 1: [0, 1, 2, 3]
  // # [1, 0.75) =0 (best), [0.75, 0.5)= 1 (good), [0.5, 0.25)= 2 (fair), and [0.25, 0]=3 (poor).
  // # QA_Overall_2, QA_Detailed_1, QA_Detailed_2
  var QA_Overall = mcd12q2IMG.select('QA_Overall_1'); // 
  // print('QA_Overall_1:', QA_Overall);
  var Mask_QA_Overall = QA_Overall.lte(1);
  
  // ### 2) QA_Detailed_1 
  // Bits 0-1: Greenup QA, 0: Best, 1: Good, 2: Fair, 3: Poor
  var QA_Detailed = mcd12q2IMG.select('QA_Detailed_1'); // 
  // print('QA_Detailed_1:', QA_Detailed);
  var BitMask_QA_Detailed = getQABits(QA_Detailed, BitNo_START, BitNo_END, rawVar+'_QA_Detailed');
  var Mask_QA_Detailed = BitMask_QA_Detailed.lte(1);
  // 
  var QA_Mask = Mask_QA_Overall.and(Mask_QA_Detailed);
  // # convert the data information of MCD12Q2 to the doy witin a year (comapred to the date 1070,1,1)
  // # The values of MCD12Q2 are "Days since Jan. 1, 1970"
  // # https://gis.stackexchange.com/questions/306738/earth-engine-mismatched-type-for-band/306796
  // # This is the offset needed to convert to the relative Julian day for the year
  var timeField = metricIMG.get('system:time_start'); // # initial date, Days since Jan 1, 1970
  var baseDate = ee.Date.fromYMD(1970, 1, 1);
  var tempYear = ee.Date(timeField).get('year');
  var firstDoyDate = ee.Date.fromYMD(tempYear, 1, 1);//'1970-01-01'
  var doyDiffBefore = firstDoyDate.difference(baseDate, 'day');
  // ## get the phenological indicators 
  var phenoDoyIMG = metricIMG.subtract(doyDiffBefore).int16().rename(pheno);
  
  // TRY1：without_maskedQA
  if (QA_mask == 'without_maskedQA'){
    phenoDoyIMG = phenoDoyIMG;
  }
  // TRY2：maskedQA_Overall_AND_Detailed
  else if (QA_mask == 'maskedQA'){
    phenoDoyIMG = phenoDoyIMG.updateMask(QA_Mask);
  }
  // TRY3：maskedQA_Overall
  else if (QA_mask == 'maskedQA_Overall'){
    phenoDoyIMG = phenoDoyIMG.updateMask(Mask_QA_Overall);
  }
  // return 
  return phenoDoyIMG.copyProperties(mcd12q2IMG, mcd12q2IMG.propertyNames())
                    .set({
                          'system:time_start': firstDoyDate.millis(),
                          'year': tempYear,
                    });
}

// ### Aggregate
function phenoAggregate(image_srs, method){
  /***
   * Calculate the majority lucc of 100m pixels within each 500m pixel-->majority500
   */
  // slopeIMG = slopeIMG.setDefaultProjection(proj_original);
  image_srs = ee.Image(image_srs);//.select(band);
  // atScale
  // ## aggragation method
  if (method == 'Mean'){
    var image_Aggregate = image_srs.reduceResolution({
        reducer: ee.Reducer.mean(),//.unweighted();
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
        reducer: ee.Reducer.percentile([30]),//.unweighted();
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
        reducer: ee.Reducer.intervalMean(5, 95),//.unweighted();
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