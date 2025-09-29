import axios from 'axios'

export const getCommission = (orderNum) => axios.get('/api/commission', { params: { orderNum } })
export const createCommission = (data) => axios.post('/api/commission', data)

export const generateDocument = (data) =>
  axios.post('/api/documents/commission', data, { responseType: 'blob' })

export const generateSampleFlow = (data) =>
  axios.post('/api/documents/sample-flow', data, { responseType: 'blob' })

export const getSalesperson = () => axios.get('/api/salespersons')
export const getSalespersonContact = (account) =>
  axios.get('/api/salespersons/contact', { params: { account } })
export const getSalespersonByCustomer = (customer_id) =>
  axios.get('/api/salespersons/by-customer', { params: { customer_id } })

export const getCustomers = (customerNameTerm, contactNameTerm, contactPhoneTerm) =>
  axios.get('/api/form/customers', { params: {
    customerNameTerm: customerNameTerm || '',
    contactNameTerm: contactNameTerm || '',
    contactPhoneTerm: contactPhoneTerm || ''
  }})

export const getPayers = (payerNameTerm, payerContactNameTerm, payerContactPhoneTerm) =>
  axios.get('/api/form/payers', { params: {
    payerNameTerm: payerNameTerm || '',
    payerContactNameTerm: payerContactNameTerm || '',
    payerContactPhoneTerm: payerContactPhoneTerm || ''
  }})

export const prefillPayment = (customer_id) =>
  axios.get('/api/form/prefill-payers', { params: { customer_id } })

export const getPrices = (testItem, testCondition, testCode) =>
  axios.get('/api/form/prices', { params: {
    testItem: testItem || '',
    testCondition: testCondition || '',
    testCode: testCode || ''
  }})

export const generateOrderTemplate = (data) =>
  axios.post('/api/templates/generate-order-template', data, { responseType: 'blob' })

export const generateProcessTemplate = (data) =>
  axios.post('/api/templates/generate-process-template', data, { responseType: 'blob' })
