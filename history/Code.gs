/*****************************************************************
 * Meal Plan Generator — cooldown history endpoint (Google Apps Script)
 *
 * Stores which recipes were used in which week, in a "History" tab of the
 * bound Google Sheet, so the 4-week no-repeat cooldown works across machines.
 *
 * The web app READS history directly from the published sheet (CSV) and POSTs
 * here only when you Confirm. This endpoint checks your password server-side
 * before writing, so the public page never holds a usable write credential.
 *
 * Setup: see history/SETUP.md.
 *****************************************************************/

// ====== CONFIG ======
// Paste the SAME SHA-256 hash you put in index.html (PASSWORD_HASH).
// Get it with:  printf '%s' 'YOUR_PASSWORD' | shasum -a 256
var PASSWORD_HASH = 'PASTE_THE_SAME_HASH_AS_index.html';
var HISTORY_SHEET = 'History';
// ====================

function doPost(e){
  try{
    var body = JSON.parse(e.postData.contents);
    if(sha256hex(String(body.password||'')) !== PASSWORD_HASH){
      return out('forbidden');                       // wrong password -> ignore
    }
    var week = parseInt(body.week, 10);
    var ids  = Array.isArray(body.ids) ? body.ids : [];
    if(isNaN(week) || !ids.length) return out('noop');

    var sh = ensureSheet();
    var rows = ids.map(function(id){ return [week, id]; });
    sh.getRange(sh.getLastRow()+1, 1, rows.length, 2).setValues(rows);
    return out('ok ' + rows.length);
  }catch(err){
    return out('error');
  }
}

// GET is handy for a quick "is it deployed?" check in the browser.
function doGet(){ return out('Meal Plan history endpoint is live. POST only.'); }

function ensureSheet(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(HISTORY_SHEET);
  if(!sh){
    sh = ss.insertSheet(HISTORY_SHEET);
    sh.getRange(1,1,1,2).setValues([['Week','RecipeID']]);
  } else if(sh.getLastRow() === 0){
    sh.getRange(1,1,1,2).setValues([['Week','RecipeID']]);
  }
  return sh;
}

function out(t){ return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.TEXT); }

function sha256hex(s){
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var hex = '';
  for(var i=0;i<bytes.length;i++){ hex += ((bytes[i] & 0xff) + 0x100).toString(16).slice(1); }
  return hex;
}

/* Run once from the editor to create the History tab + header. */
function setupHistoryTab(){ ensureSheet(); }
