const PDFDocument = require('pdfkit');

function generatePDF(data) {
    const doc = new PDFDocument();

    doc.font('Helvetica-Bold').fontSize(18).text(data.name);
    doc.font('Helvetica-Bold').fontSize(18).text(data.email);
    doc.font('Helvetica-Bold').fontSize(18).text(data.phone);

    doc.fontSize(18).text('Skills:');
    data.skills.forEach(skill => doc.font('Helvetica').fontSize(16).text(skill));

    doc.fontSize(18).text('Education:');
    data.education.forEach(edu => {
        doc.font('Helvetica-Bold').fontSize(16).text(`${edu.school_name} (${edu.year})`);
        doc.font('Helvetica').fontSize(14).text(`- ${edu.level}, ${edu.title}`);
    });

    doc.fontSize(18).text('Experiences:');
    data.experiences.forEach(exp => {
        doc.font('Helvetica-Bold').fontSize(16).text(`${exp.position} at ${exp.company}`);
        doc.font('Helvetica').fontSize(14).text(`- ${exp.work_year || 'Present'} `);
        doc.font('Helvetica').fontSize(14).text(`- Duties: ${exp.duties.join(', ')}`);
    });

    return doc;
}

module.exports = { generatePDF };
