/*****************************************************************
 * Meal Plan Generator — Telegram bot (Google Apps Script)
 * Edits the "All Recipes" tab of the bound Google Sheet.
 *
 * Commands:
 *   /start /help          – intro
 *   /newdish              – add a recipe (guided template)
 *   /editdish <name>      – edit any field of an existing recipe
 *   /find <text>          – search recipes by name/ingredient
 *   /list                 – count + last few recipes
 *   /cancel               – abort current action
 *
 * Setup: see bot/SETUP.md. After deploying, run setWebhook() once.
 *****************************************************************/

// ====== CONFIG — fill these two in (see SETUP.md) ======
var BOT_TOKEN = 'PASTE_YOUR_BOT_TOKEN_HERE';
var ALLOWED_CHAT_IDS = [];   // [] = anyone; or e.g. [123456789] to lock to your Telegram id
// =======================================================

var SHEET_NAME = 'All Recipes';
var FIELDS = ['Recipe','Ingredients','Meal Type','Cuisine','Confidence','Link'];
var SOUP_COL_NAME = 'Soup';
var API = 'https://api.telegram.org/bot' + BOT_TOKEN;

/* ---------- Telegram plumbing ---------- */
function tg(method, payload){
  return UrlFetchApp.fetch(API + '/' + method, {
    method:'post', contentType:'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions:true
  });
}
function send(chatId, text, kb){
  var p = {chat_id:chatId, text:text, parse_mode:'HTML', disable_web_page_preview:true};
  if(kb) p.reply_markup = kb;
  tg('sendMessage', p);
}

/* ---------- per-chat conversation state ---------- */
function stateKey(id){ return 'state_' + id; }
function getState(id){ var s=PropertiesService.getScriptProperties().getProperty(stateKey(id)); return s?JSON.parse(s):null; }
function setState(id,obj){ PropertiesService.getScriptProperties().setProperty(stateKey(id), JSON.stringify(obj)); }
function clearState(id){ PropertiesService.getScriptProperties().deleteProperty(stateKey(id)); }

/* ---------- sheet helpers ---------- */
function sheet(){ return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME); }
function header(){ return sheet().getRange(1,1,1,sheet().getLastColumn()).getValues()[0]; }
function colIndex(name){ var h=header(); for(var i=0;i<h.length;i++) if((h[i]+'').trim()===name) return i+1; return -1; }
function ensureSoupCol(){
  var idx = colIndex(SOUP_COL_NAME);
  if(idx>0) return idx;
  var sh=sheet(), c=sh.getLastColumn()+1;
  sh.getRange(1,c).setValue(SOUP_COL_NAME);
  return c;
}
function isSoupName(name){ return /soup|湯|汤/i.test(name); }
function findRowByName(name){
  var sh=sheet(), n=sh.getLastRow(), key=(name+'').trim().toLowerCase();
  var vals=sh.getRange(1,1,n,1).getValues();
  for(var r=2;r<=n;r++) if((vals[r-1][0]+'').trim().toLowerCase()===key) return r;
  return -1;
}

/* ---------- webhook entrypoint ---------- */
function doPost(e){
  try{
    var update = JSON.parse(e.postData.contents);
    var msg = update.message || update.edited_message;
    if(!msg || !msg.text) return ok();
    var chatId = msg.chat.id;
    if(ALLOWED_CHAT_IDS.length && ALLOWED_CHAT_IDS.indexOf(chatId)<0){
      send(chatId,'⛔ Not authorised.'); return ok();
    }
    handle(chatId, msg.text.trim());
  }catch(err){ /* swallow so Telegram doesn't retry-storm */ }
  return ok();
}
function ok(){ return ContentService.createTextOutput('ok'); }

/* ---------- command router ---------- */
function handle(chatId, text){
  if(text === '/cancel'){ clearState(chatId); return send(chatId,'❌ Cancelled.'); }
  if(text === '/start' || text === '/help') return send(chatId, HELP);
  if(text === '/list') return doList(chatId);
  if(text.indexOf('/find')===0) return doFind(chatId, text.replace('/find','').trim());
  if(text === '/newdish') return startNew(chatId);
  if(text.indexOf('/editdish')===0) return startEdit(chatId, text.replace('/editdish','').trim());

  // not a command -> feed into any active conversation
  var st = getState(chatId);
  if(st && st.mode==='new')  return stepNew(chatId, st, text);
  if(st && st.mode==='edit') return stepEdit(chatId, st, text);
  send(chatId, 'Unknown command. /help for options.');
}

var HELP =
'<b>🍽 Meal Plan Recipe Bot</b>\n\n' +
'/newdish — add a recipe (I\'ll walk you through each field)\n' +
'/editdish <i>name</i> — edit a recipe\n' +
'/find <i>text</i> — search recipes\n' +
'/list — how many recipes + latest\n' +
'/cancel — stop current action\n\n' +
'Fields: Recipe, Ingredients, Meal Type (Breakfast/Lunch/Dinner), ' +
'Cuisine (Asian/Chinese/Western), Confidence (Low/Med/High), Link. ' +
'Soup is auto-tagged from the name.';

/* ---------- /list ---------- */
function doList(chatId){
  var sh=sheet(), n=sh.getLastRow()-1;
  var last = sh.getRange(Math.max(2,sh.getLastRow()-4),1,Math.min(5,n),1).getValues().map(function(r){return '• '+r[0];}).join('\n');
  send(chatId, '<b>'+n+'</b> recipes.\nLatest:\n'+last);
}

/* ---------- /find ---------- */
function doFind(chatId, q){
  if(!q) return send(chatId,'Usage: /find tofu');
  var sh=sheet(), n=sh.getLastRow();
  var vals=sh.getRange(2,1,n-1,2).getValues(), ql=q.toLowerCase(), hits=[];
  for(var i=0;i<vals.length && hits.length<20;i++){
    if((vals[i][0]+' '+vals[i][1]).toLowerCase().indexOf(ql)>=0) hits.push('• '+vals[i][0]);
  }
  send(chatId, hits.length? hits.join('\n') : 'No matches for “'+q+'”.');
}

/* ---------- /newdish ---------- */
function startNew(chatId){
  setState(chatId, {mode:'new', step:0, data:{}});
  send(chatId,
    '🆕 <b>New recipe</b>. I\'ll ask one field at a time. /cancel to stop.\n\n' +
    'Tip: copy this template, fill it, and send it all at once instead:\n' +
    '<code>Name: \nIngredients: a, b, c\nMeal: Dinner\nCuisine: Chinese\nConfidence: Med\nLink: </code>\n\n' +
    'Or just reply with the <b>recipe name</b> to go step-by-step.');
}
function stepNew(chatId, st, text){
  // template paste shortcut
  if(st.step===0 && /name\s*:/i.test(text)){
    var d = parseTemplate(text);
    if(!d['Recipe']) return send(chatId,'Template needs a Name. Try again or /cancel.');
    return saveNew(chatId, d);
  }
  var prompts = [
    ['Recipe','Recipe name?'],
    ['Ingredients','Ingredients? (comma-separated, or “-” for none)'],
    ['Meal Type','Meal Type? Breakfast / Lunch / Dinner (comma-separate if multiple)'],
    ['Cuisine','Cuisine? Asian / Chinese / Western'],
    ['Confidence','Confidence? Low / Med / High'],
    ['Link','Link? (or “-” for none)']
  ];
  var field = prompts[st.step][0];
  st.data[field] = (text==='-' ? '' : text);
  st.step++;
  setState(chatId, st);
  if(st.step < prompts.length) return send(chatId, '('+(st.step+1)+'/6) '+prompts[st.step][1]);
  saveNew(chatId, st.data);
}
function saveNew(chatId, d){
  var sh=sheet(), soupCol=ensureSoupCol(), h=header();
  var row = new Array(sh.getLastColumn()).fill('');
  FIELDS.forEach(function(f){ var c=colIndex(f); if(c>0) row[c-1]= d[f]||''; });
  row[soupCol-1] = isSoupName(d['Recipe']||'') ? true : '';
  sh.appendRow(row);
  clearState(chatId);
  send(chatId, '✅ Added <b>'+esc(d['Recipe'])+'</b>'+(row[soupCol-1]?' 🥣 (tagged soup)':'')+'.');
}

/* ---------- /editdish ---------- */
function startEdit(chatId, name){
  if(!name) return send(chatId,'Usage: /editdish <recipe name>\n(use /find to look one up)');
  var row = findRowByName(name);
  if(row<0) return send(chatId,'Not found: “'+name+'”. Try /find '+name);
  setState(chatId, {mode:'edit', row:row, field:null});
  var fields = FIELDS.slice();
  send(chatId, '✏️ Editing <b>'+esc(name)+'</b>. Which field?\n'+
    fields.map(function(f,i){return (i+1)+'. '+f;}).join('\n')+
    '\n\nReply with the number or field name.');
}
function stepEdit(chatId, st, text){
  if(st.field===null){
    var f = resolveField(text);
    if(!f) return send(chatId,'Pick a field by number (1-6) or name. /cancel to stop.');
    st.field=f; setState(chatId, st);
    var cur = sheet().getRange(st.row, colIndex(f)).getValue();
    return send(chatId,'Current <b>'+f+'</b>: <i>'+esc(cur||'(empty)')+'</i>\nSend the new value (“-” to clear):');
  }
  var val = (text==='-'?'':text);
  sheet().getRange(st.row, colIndex(st.field)).setValue(val);
  if(st.field==='Recipe'){   // re-tag soup if name changed
    sheet().getRange(st.row, ensureSoupCol()).setValue(isSoupName(val)?true:'');
  }
  var nm = sheet().getRange(st.row, colIndex('Recipe')).getValue();
  clearState(chatId);
  send(chatId,'✅ Updated <b>'+st.field+'</b> for <b>'+esc(nm)+'</b>.');
}
function resolveField(text){
  var n=parseInt(text); if(n>=1 && n<=FIELDS.length) return FIELDS[n-1];
  var t=text.trim().toLowerCase();
  for(var i=0;i<FIELDS.length;i++) if(FIELDS[i].toLowerCase()===t) return FIELDS[i];
  if(t==='meal') return 'Meal Type'; if(t==='name') return 'Recipe';
  return null;
}

/* ---------- utils ---------- */
function parseTemplate(t){
  var map={name:'Recipe',ingredients:'Ingredients',meal:'Meal Type','meal type':'Meal Type',
           cuisine:'Cuisine',confidence:'Confidence',link:'Link'};
  var d={};
  t.split('\n').forEach(function(line){
    var m=line.match(/^\s*([^:]+):\s*(.*)$/); if(!m) return;
    var k=map[m[1].trim().toLowerCase()]; if(k) d[k]= m[2].trim();
  });
  return d;
}
function esc(s){ return (s+'').replace(/[<>&]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];}); }

/* ---------- one-time setup helpers (run from the editor) ---------- */
function setWebhook(){
  var url = ScriptApp.getService().getUrl();
  var r = tg('setWebhook', {url:url});
  Logger.log(r.getContentText());
}
function deleteWebhook(){ Logger.log(tg('deleteWebhook',{}).getContentText()); }
function whoAmI(){ Logger.log(tg('getMe',{}).getContentText()); }
