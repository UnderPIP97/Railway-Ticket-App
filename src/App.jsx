import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function App() {
  const [view, setView] = useState('home'); // 'home', 'manual', 'chat'
  const [formData, setFormData] = useState({
    train: '',
    date: '',
    name: '',
    pnr: '',
    noOfBerth: '',
    destination: '',
    requestFrom: '',
    priority: ''
  });

  const [records, setRecords] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [multipleParsed, setMultipleParsed] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddRecord = () => {
    // Validate required fields
    if (!formData.train || !formData.date || !formData.name || !formData.pnr || 
        !formData.noOfBerth || !formData.destination || !formData.requestFrom || !formData.priority) {
      alert('Please fill all fields');
      return;
    }

    setRecords(prev => [...prev, { ...formData, id: Date.now() }]);
    
    // Clear form
    setFormData({
      train: '',
      date: '',
      name: '',
      pnr: '',
      noOfBerth: '',
      destination: '',
      requestFrom: '',
      priority: ''
    });
  };

  const handleDeleteRecord = (id) => {
    setRecords(prev => prev.filter(record => record.id !== id));
  };

  const handleClearForm = () => {
    setFormData({
      train: '',
      date: '',
      name: '',
      pnr: '',
      noOfBerth: '',
      destination: '',
      requestFrom: '',
      priority: ''
    });
  };

  const parseMessageInput = () => {
    const text = chatInput;

    // Split into multiple messages by common separators:
    // numbered lists (1. 2. 3.), double newlines, or "---" dividers
    const messageBlocks = text
      .split(/(?:\n{2,}|---+|\d+\.\s+(?=PNR|Trn|TRN|Train|Name|DOJ))/i)
      .map(b => b.trim())
      .filter(b => b.length > 5);

    const parseBlock = (block) => {
      // PNR
      const pnrMatch = block.match(/PNR[:\s-]*(\d{10,12})/i);
      const pnr = pnrMatch ? pnrMatch[1] : '';

      // Train
      const trainMatch = block.match(/(?:TRN|Trn|Train)[:\s-]*(\d{4,5})/i);
      const train = trainMatch ? trainMatch[1] : '';

      // Date - convert "26-04" or "26/04" to "26/04/2026"
      let date = '';
      const dateMatch = block.match(/(?:DOJ|Dt|Date)[:\s-]*(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{2,4})?)?/i);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (!year) year = '2026';
        else if (year.length === 2) year = '20' + year;
        date = `${day}/${month}/${year}`;
      }

      // Name
      let name = '';
      const nameMatch = block.match(/(?:Name)[:\s.]*([A-Za-z\s+\d]+?)(?:\n|Mobile|\d{10}|Class|$)/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
      } else {
        // Look for a line of all caps with optional +N suffix (e.g. AMIT VERMA+2)
        const keywords = /^(PNR|TRN|DOJ|CLASS|BERTH|FROM|FRM|DP|MOBILE|GM|SECRETARY|PUNE|CSTM|LTT|NDLS|HWH|DBG)/i;
        const lines = block.split(/\n/);
        for (const line of lines) {
          const l = line.trim();
          // Match: "AMIT VERMA" or "AMIT VERMA+2" or "PRAMEELA RANI+1"
          if (/^[A-Z][A-Z\s]+(\+\d+)?$/.test(l) && l.replace(/\+\d+/, '').trim().length > 3 && l.length < 35 && !keywords.test(l)) {
            name = l;
          }
        }
      }

      // No. of Berth - extract count and class separately
      let noOfBerth = '';
      const berthCountMatch = block.match(/(\d+)\s*berth/i);
      const berthCount = berthCountMatch ? berthCountMatch[1] : '';
      const classMatch = block.match(/(?:Class\s*)([A-Z0-9]{1,3})(?:\s|\d|,|$)/i);
      const travelClass = classMatch ? classMatch[1].toUpperCase() : '';
      if (berthCount && travelClass) noOfBerth = `${travelClass}-${berthCount}`;
      else if (berthCount) noOfBerth = berthCount;
      else if (travelClass) noOfBerth = travelClass;

      // Destination
      let destination = '';
      const destMatch1 = block.match(/([A-Z]{3,5})\s*-\s*([A-Z]{3,5})/);
      if (destMatch1) {
        destination = `${destMatch1[1]}-${destMatch1[2]}`;
      } else {
        const destMatch2 = block.match(/(?:Frm|From)[:\s]*([A-Z]+)\s*(?:to|TO)\s*([A-Z]+)/i);
        if (destMatch2) destination = `${destMatch2[1]}-${destMatch2[2]}`;
      }

      // Request From - extract only the authority name, not the request text
      let requestFrom = 'Secretary CR';
      const requestMatch = block.match(/(GM|Secretary\s*CR|Secretary|Chief|Officer)\s*(?:sir|CR)?/i);
      if (requestMatch) {
        requestFrom = requestMatch[0].trim();
      }

      // Priority
      const priority = /urgent|emergency/i.test(block) ? 'Urgent' : 'Important';

      return { train, date, name, pnr, noOfBerth, destination, requestFrom, priority };
    };

    const results = messageBlocks.map(parseBlock).filter(r => r.pnr || r.train || r.name);

    if (results.length === 0) {
      alert('Could not extract any details. Please check the message format.');
      return;
    }

    if (results.length === 1) {
      setParsedData(results[0]);
      setMultipleParsed(null);
    } else {
      setMultipleParsed(results);
      setParsedData(null);
    }
  };

  const confirmParsedData = () => {
    if (parsedData) {
      setRecords(prev => [...prev, { ...parsedData, id: Date.now() }]);
      setChatInput('');
      setParsedData(null);
    }
  };

  const confirmAllParsed = () => {
    if (multipleParsed) {
      const newRecords = multipleParsed.map(r => ({ ...r, id: Date.now() + Math.random() }));
      setRecords(prev => [...prev, ...newRecords]);
      setChatInput('');
      setMultipleParsed(null);
    }
  };

  const editMultipleParsedField = (index, field, value) => {
    setMultipleParsed(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const editParsedField = (field, value) => {
    setParsedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const MANDATORY_FIELDS = ['train', 'date', 'name', 'pnr', 'noOfBerth', 'destination', 'requestFrom'];

  const validateRecords = (recordsList) => {
    const errors = [];
    recordsList.forEach((record, idx) => {
      const missing = MANDATORY_FIELDS.filter(f => !record[f] || record[f].trim() === '');
      if (missing.length > 0) {
        errors.push(`Record ${idx + 1} (${record.name || 'Unnamed'}): Missing ${missing.join(', ')}`);
      }
    });
    return errors;
  };

  const generateExcel = () => {
    if (records.length === 0) {
      alert('Please add at least one record');
      return;
    }
    const errors = validateRecords(records);
    if (errors.length > 0) {
      alert('Please complete all mandatory fields before exporting:\n\n' + errors.join('\n'));
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-GB');

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare data with exact format
    const data = [
      ['CENTRAL RAILWAY', '', '', '', '', '', '', '', 'C.S.T Mumbai'],
      ["General Manager's Office", '', '', '', '', '', '', '', ''],
      [''], // Empty row
      ['ACM R  PCCM OFFICE  CSMT', '', '', '', '', `Date: ${currentDate}`, '', '', ''],
      [''], // Empty row
      ['Sr-No', 'TRAIN', 'Date', 'NAME', 'PNR', 'No Of Berth', 'Destination', 'REQUEST FROM', 'Priority']
    ];

    // Add records
    records.forEach((record, index) => {
      data.push([
        index + 1,
        record.train,
        record.date,
        record.name,
        record.pnr,
        record.noOfBerth,
        record.destination,
        record.requestFrom,
        record.priority
      ]);
    });

    // Add footer
    data.push(['']); // Empty row
    data.push(['Pravin Baria', '', '', '', '', '', '', '', '']);
    data.push(['Chief Office Superintendent', '', '', '', '', '', '', '', '']);
    data.push(['GM Secretariat', '', '', '', '', '', '', '', '']);
    data.push(['+91-8828110017', '', '', '', '', '', '', '', '']);

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Sr-No
      { wch: 10 }, // TRAIN
      { wch: 12 }, // Date
      { wch: 20 }, // NAME
      { wch: 15 }, // PNR
      { wch: 12 }, // No Of Berth
      { wch: 15 }, // Destination
      { wch: 18 }, // REQUEST FROM
      { wch: 12 }  // Priority
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ticket Records');

    // Generate Excel file
    XLSX.writeFile(wb, `Railway_Ticket_Records_${currentDate.replace(/\//g, '-')}.xlsx`);
  };

  const generatePDF = async () => {
    if (records.length === 0) {
      alert('Please add at least one record');
      return;
    }
    const errors = validateRecords(records);
    if (errors.length > 0) {
      alert('Please complete all mandatory fields before exporting:\n\n' + errors.join('\n'));
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-GB');

    // ── Canvas: A4 LANDSCAPE, margins 20mm L/R, 25mm top, 30mm bottom ──
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageW   = 297;
    const pageH   = 210;
    const marginL = 20;
    const marginR = pageW - 20;   // 277mm
    const marginT = 25;

    // ── Off-white background ──────────────────────────────────────────
    doc.setFillColor(252, 250, 245);
    doc.rect(0, 0, pageW, pageH, 'F');

    // ── LOGO – perfectly centered ─────────────────────────────────────
    const logoSize = 22;
    const logoX    = (pageW - logoSize) / 2;
    const logoY    = marginT;

    try {
      const logoImg = new Image();
      logoImg.src   = '/indian-railways-logo.jpg';
      await new Promise((resolve, reject) => {
        logoImg.onload  = resolve;
        logoImg.onerror = reject;
      });
      doc.addImage(logoImg, 'JPEG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      // fallback circle if logo missing
      doc.setDrawColor(180, 0, 0);
      doc.setLineWidth(0.5);
      doc.circle(pageW / 2, logoY + logoSize / 2, logoSize / 2);
    }

    // ── HEADER TEXT ───────────────────────────────────────────────────
    const headerTextY = logoY + 4;   // vertically centred with logo

    // Left block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('ACM(RES)', marginL, headerTextY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('PCCM OFFICE, CSMT', marginL, headerTextY + 6);

    // Right block (right-justified to right margin)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("General Manager's Office.", marginR, headerTextY,      { align: 'right' });
    doc.text('C.S.T Mumbai - 400 001.',   marginR, headerTextY + 6,  { align: 'right' });
    doc.text(`Date: ${currentDate}`,       marginR, headerTextY + 12, { align: 'right' });

    // ── DIVIDER LINE ──────────────────────────────────────────────────
    const dividerY = logoY + logoSize + 6;
    doc.setDrawColor(200, 195, 185);
    doc.setLineWidth(0.4);
    doc.line(marginL, dividerY, marginR, dividerY);

    // ── TABLE – starts 20mm below header ─────────────────────────────
    const tableStartY = dividerY + 8;   // ~20mm gap from header area

    const tableData = records.map((r, i) => [
      i + 1,
      r.train,
      r.date,
      r.name,
      r.pnr,
      r.noOfBerth,
      r.destination,
      r.requestFrom,
      r.priority
    ]);

    doc.autoTable({
      startY: tableStartY,
      head: [['Sr-No', 'TRAIN', 'Date', 'NAME', 'PNR', 'No of Berth', 'Destination', 'Request From', 'Priority']],
      body: tableData,
      theme: 'grid',
      tableWidth: 257, // full usable width: 297 - 20L - 20R = 257mm
      styles: {
        font:          'helvetica',
        fontSize:      10,
        cellPadding:   { top: 3, bottom: 3, left: 4, right: 4 },
        minCellHeight: 8,
        lineColor:     [210, 205, 195],
        lineWidth:     0.5,
        textColor:     [30, 30, 30],
        fillColor:     [252, 250, 245],
        overflow:      'linebreak',
      },
      headStyles: {
        fillColor:  [45, 41, 38],
        textColor:  [255, 255, 255],
        fontStyle:  'bold',
        fontSize:   10,
        halign:     'center',
        valign:     'middle',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 17  },  // Sr-No
        1: { halign: 'center', cellWidth: 22  },  // TRAIN
        2: { halign: 'center', cellWidth: 28  },  // Date
        3: { halign: 'left',   cellWidth: 45  },  // NAME
        4: { halign: 'center', cellWidth: 32  },  // PNR
        5: { halign: 'center', cellWidth: 22  },  // No of Berth
        6: { halign: 'left',   cellWidth: 28  },  // Destination
        7: { halign: 'left',   cellWidth: 40  },  // Request From
        8: { halign: 'center', cellWidth: 23  },  // Priority
        // Total: 17+22+28+45+32+22+28+40+23 = 257mm ✓
      },
      alternateRowStyles: {
        fillColor: [246, 244, 238],
      },
      margin: { left: marginL, right: 20 },
    });

    // ── FOOTER – 40mm gap after table ────────────────────────────────
    const tableEndY  = doc.lastAutoTable.finalY;
    const footerY    = tableEndY + 20;   // 40mm white space

    // Left contact block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('PRAVIN BARIA', marginL, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Chief Office Superintendent', marginL, footerY + 6);
    doc.text('GM Secretariat',              marginL, footerY + 12);
    doc.text('+91-8828110017',              marginL, footerY + 18);

    // Right signature block
    const sigX = marginR;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);

    // Load and place actual signature image
    try {
      const signImg = new Image();
      signImg.src = '/p_sign.png';
      await new Promise((resolve, reject) => {
        signImg.onload  = resolve;
        signImg.onerror = reject;
      });
      // Place signature image - right aligned
      const sigW = 40;
      const sigH = 15;
      doc.addImage(signImg, 'PNG', sigX - sigW, footerY - 5, sigW, sigH);
    } catch (e) {
      // fallback text if image missing
      doc.text('(Signature)', sigX, footerY, { align: 'right' });
    }

    // Printed name under signature
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text('PRAVIN BARIA', sigX, footerY + 16, { align: 'right' });

    // ── SAVE ──────────────────────────────────────────────────────────
    doc.save(`ACM_RES_Ticket_Records_${currentDate.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div>
      {view === 'home' && (
        <div className="home-view">
          <div className="welcome-header">
            <div className="welcome-badge">Indian Railways · PCCM Office CSMT</div>
            <h1>Welcome back, Pravin</h1>
            <p>Generate ticket booking records in seconds</p>
          </div>

          <div className="option-cards">
            <div className="option-card" onClick={() => setView('chat')}>
              <div className="option-card-icon purple">⚡</div>
              <h3>AI Assist</h3>
              <p>Paste a message and let the system extract all details automatically</p>
              <span className="option-card-link">Quick Entry</span>
            </div>

            <div className="option-card" onClick={() => setView('manual')}>
              <div className="option-card-icon blue">📋</div>
              <h3>Manual Form</h3>
              <p>Fill in each field individually with full control over the data</p>
              <span className="option-card-link">Manual Entry</span>
            </div>
          </div>
        </div>
      )}

      {view === 'chat' && (
        <div className="inner-view">
          <div className="inner-topbar">
            <button className="btn-back" onClick={() => setView('home')}>← Back</button>
            <h1>Smart Input</h1>
          </div>

          <div className="card">
            <div className="card-title">Paste your message</div>
            <textarea
              className="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Paste your booking request message here..."
            />
            <button className="btn-parse" onClick={parseMessageInput}>
              Extract Details
            </button>
          </div>

          {parsedData && (
            <div className="preview-section">
              <div className="preview-header">
                <div className="preview-dot"></div>
                <h2>Review Extracted Details</h2>
              </div>
              <p className="preview-note">Edit any field if needed, then confirm to add the record.</p>

              <div className="preview-grid">
                {[
                  { label: 'Train Number', field: 'train' },
                  { label: 'Date', field: 'date' },
                  { label: 'Passenger Name', field: 'name' },
                  { label: 'PNR Number', field: 'pnr' },
                  { label: 'No. of Berth', field: 'noOfBerth' },
                  { label: 'Destination', field: 'destination' },
                  { label: 'Request From', field: 'requestFrom' },
                ].map(({ label, field }) => (
                  <div className="preview-item" key={field}>
                    <label>{label} <span style={{color:'#e53e3e'}}>*</span></label>
                    <input
                      type="text"
                      value={parsedData[field]}
                      className={!parsedData[field] ? 'field-error' : ''}
                      onChange={(e) => editParsedField(field, e.target.value)}
                    />
                    {!parsedData[field] && <span className="field-error-label">Required</span>}
                  </div>
                ))}
                <div className="preview-item">
                  <label>Priority</label>
                  <select value={parsedData.priority} onChange={(e) => editParsedField('priority', e.target.value)}>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="button-group">
                <button className="btn-primary" onClick={confirmParsedData}>Confirm & Add Record</button>
                <button className="btn-secondary" onClick={() => setParsedData(null)}>Cancel</button>
              </div>
            </div>
          )}

          {multipleParsed && (
            <div className="preview-section">
              <div className="preview-header">
                <div className="preview-dot"></div>
                <h2>{multipleParsed.length} Records Detected</h2>
              </div>
              <p className="preview-note">Review and edit each record. Click "Add All" to confirm.</p>

              {multipleParsed.map((item, idx) => (
                <div key={idx} className="multi-record-block">
                  <div className="multi-record-label-row">
                    <span className="multi-record-label">Record {idx + 1}</span>
                    <button
                      className="btn-delete-preview"
                      onClick={() => {
                        const updated = multipleParsed.filter((_, i) => i !== idx);
                        updated.length === 0 ? setMultipleParsed(null) : setMultipleParsed(updated);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="preview-grid">
                    {[
                      { label: 'Train Number', field: 'train' },
                      { label: 'Date', field: 'date' },
                      { label: 'Passenger Name', field: 'name' },
                      { label: 'PNR Number', field: 'pnr' },
                      { label: 'No. of Berth', field: 'noOfBerth' },
                      { label: 'Destination', field: 'destination' },
                      { label: 'Request From', field: 'requestFrom' },
                    ].map(({ label, field }) => (
                      <div className="preview-item" key={field}>
                        <label>{label} <span style={{color:'#e53e3e'}}>*</span></label>
                        <input
                          type="text"
                          value={item[field]}
                          className={!item[field] ? 'field-error' : ''}
                          onChange={(e) => editMultipleParsedField(idx, field, e.target.value)}
                        />
                        {!item[field] && <span className="field-error-label">Required</span>}
                      </div>
                    ))}
                    <div className="preview-item">
                      <label>Priority</label>
                      <select value={item.priority} onChange={(e) => editMultipleParsedField(idx, 'priority', e.target.value)}>
                        <option value="Important">Important</option>
                        <option value="Urgent">Urgent</option>
                        <option value="Normal">Normal</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <div className="button-group" style={{ marginTop: '20px' }}>
                <button className="btn-primary" onClick={confirmAllParsed}>Add All {multipleParsed.length} Records</button>
                <button className="btn-secondary" onClick={() => setMultipleParsed(null)}>Cancel</button>
              </div>
            </div>
          )}

          {records.length > 0 && (
            <div className="records-section" style={{ marginTop: '24px' }}>
              <div className="records-header">
                <h2>Records</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className="records-count">{records.length}</span>
                  <button className="btn-clear-all" onClick={() => { if (window.confirm('Clear all records?')) setRecords([]); }}>Clear All</button>
                </div>
              </div>
              <div className="records-list">
                {records.map((record, idx) => (
                  <div key={record.id} className="record-item">
                    <div className="record-number">{idx + 1}</div>
                    <div className="record-info">
                      <p><strong>Train {record.train}</strong> · {record.date} · {record.destination}</p>
                      <p>{record.name} · PNR {record.pnr} · {record.noOfBerth} · {record.requestFrom} · {record.priority}</p>
                    </div>
                    <button className="btn-danger" onClick={() => handleDeleteRecord(record.id)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="generate-bar">
                <button className="btn-excel" onClick={generateExcel}>Download Excel</button>
                <button className="btn-pdf" onClick={generatePDF}>Download PDF</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'manual' && (
        <div className="inner-view">
          <div className="inner-topbar">
            <button className="btn-back" onClick={() => setView('home')}>← Back</button>
            <h1>Manual Entry</h1>
          </div>

          <div className="card">
            <div className="card-title">Ticket Details</div>
            <div className="form-grid">
              {[
                { label: 'Train Number', name: 'train', placeholder: 'e.g. 18520' },
                { label: 'Passenger Name', name: 'name', placeholder: 'e.g. PRAMEELA RANI+1' },
                { label: 'PNR Number', name: 'pnr', placeholder: 'e.g. 8246890298' },
                { label: 'No. of Berth', name: 'noOfBerth', placeholder: 'e.g. 2AC-2' },
                { label: 'Destination', name: 'destination', placeholder: 'e.g. LTT-RJY' },
                { label: 'Request From', name: 'requestFrom', placeholder: 'e.g. Secretary CR' },
              ].map(({ label, name, placeholder }) => (
                <div className="form-group" key={name}>
                  <label>{label}</label>
                  <input
                    type="text"
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="form-group">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange}>
                  <option value="">Select Priority</option>
                  <option value="Important">Important</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>
            <div className="button-group">
              <button className="btn-primary" onClick={handleAddRecord}>Add Record</button>
              <button className="btn-secondary" onClick={handleClearForm}>Clear</button>
            </div>
          </div>

          {records.length > 0 && (
            <div className="records-section" style={{ marginTop: '24px' }}>
              <div className="records-header">
                <h2>Records</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span className="records-count">{records.length}</span>
                  <button className="btn-clear-all" onClick={() => { if (window.confirm('Clear all records?')) setRecords([]); }}>Clear All</button>
                </div>
              </div>
              <div className="records-list">
                {records.map((record, idx) => (
                  <div key={record.id} className="record-item">
                    <div className="record-number">{idx + 1}</div>
                    <div className="record-info">
                      <p><strong>Train {record.train}</strong> · {record.date} · {record.destination}</p>
                      <p>{record.name} · PNR {record.pnr} · {record.noOfBerth} · {record.requestFrom} · {record.priority}</p>
                    </div>
                    <button className="btn-danger" onClick={() => handleDeleteRecord(record.id)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="generate-bar">
                <button className="btn-excel" onClick={generateExcel}>Download Excel</button>
                <button className="btn-pdf" onClick={generatePDF}>Download PDF</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
