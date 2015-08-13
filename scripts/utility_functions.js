tierStrings = { '1': "BRONZE",
                '2': "SILVER",
                '3': "GOLD",
                '4': "PLATINUM",
                '5': "DIAMOND",
                '6': "MASTER",
                '7': "CHALLENGER" };

tierInts = {};

for (t in tierStrings) {
    tierInts[tierStrings[t]] = t;
}

divisionStrings = { '1': "I",
                    '2': "II",
                    '3': "III",
                    '4': "IV",
                    '5': "V" };

divisionInts = {};

for (d in divisionStrings) {
    divisionInts[divisionStrings[d]] = d;
}

exports.tierStrings = tierStrings;
exports.tierInts = tierInts;
exports.MAX_TIER = tierInts['CHALLENGER'];

exports.divisionStrings = divisionStrings;
exports.divisionInts = divisionInts;

exports.rankString = function(tier, division){
                        return tierStrings[tier]+' '+
                               divisionStrings[division];
                     };