// excel_export.js
function exportJsonToXlsx(jsonArray, filename='export.xlsx', sheetName='Sheet1') {
  const ws = XLSX.utils.json_to_sheet(jsonArray);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
