cd /home/claude/qc
cat p1.html p2.html > index.html
echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>' >> index.html
echo '<script>' >> index.html; cat p0.js p3.js p4a.js p4b.js p5a.js p5b.js p5c.js p5e.js p6.js p7.js p8.js p9.js p10.js p11.js p5d.js >> index.html; echo '</script>' >> index.html
# standalone page for GitHub Pages: full document with viewport meta (the artifact uses index.html as-is)
{ printf '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0B7A6F"><meta name="color-scheme" content="light dark">\n'; cat index.html; printf '\n</body></html>\n'; } > pages.html
