require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { router: ordersRouter } = require('./routes/orders');
const { router: testItemsRouter } = require('./routes/testItems');
const { router: assignmentsRouter } = require('./routes/assignments');
const { router: samplesRouter } = require('./routes/samples');
const { router: priceRouter } = require('./routes/price');
const { router: filesRouter } = require('./routes/files');
const { router: lookupRouter } = require('./routes/lookup');
const { router: salesRouter } = require('./routes/salespersons');
const { router: formRouter } = require('./routes/form');
const { router: commissionRouter } = require('./routes/commission');
const { router: documentsRouter } = require('./routes/documents');
const { router: templatesRouter } = require('./routes/templates');

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(require('path').join(__dirname, '..', 'uploads')));

app.use('/api/orders', ordersRouter);
app.use('/api/test-items', testItemsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/samples', samplesRouter);
app.use('/api/price', priceRouter);
app.use('/api/files', filesRouter);
app.use('/api/lookup', lookupRouter);
app.use('/api/salespersons', salesRouter);
app.use('/api/form', formRouter);
app.use('/api/commission', commissionRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/templates', templatesRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('[server] http://localhost:'+port));
