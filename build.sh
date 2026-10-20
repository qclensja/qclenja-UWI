cd /home/claude/qc
cat p1.html p2.html > index.html
echo '<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>' >> index.html
echo '<script>' >> index.html; cat p0.js p3.js p4a.js p4b.js p5a.js p5b.js p5c.js p5e.js p6.js p7.js p5d.js >> index.html; echo '</script>' >> index.html
