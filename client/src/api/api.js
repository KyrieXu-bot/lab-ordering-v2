import axios from 'axios'

axios.interceptors.request.use((config) => {
  const session = JSON.parse(localStorage.getItem('ordering_session') || 'null')
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`
  return config
})

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/__preview/')) {
      localStorage.removeItem('ordering_session')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const login = (username, password) => axios.post('/api/auth/login', { username, password })
export const getOrderRequests = (params = {}) => axios.get('/api/order-requests', { params })
export const getOrderRequest = (id) => axios.get(`/api/order-requests/${id}`)
export const createOrderRequest = (payload) => axios.post('/api/order-requests', { payload })
export const withdrawOrderRequest = (id) => axios.post(`/api/order-requests/${id}/withdraw`)
export const returnOrderRequest = (id, note) => axios.post(`/api/order-requests/${id}/return`, { note })
export const approveOrderRequest = (id, payload, note = '') =>
  axios.post(`/api/order-requests/${id}/approve`, { payload, note })
export const generateOrderRequestPdf = (id) =>
  axios.post(`/api/order-requests/${id}/generate-pdf`)
export const downloadOrderRequestAttachment = (id) =>
  axios.get(`/api/order-requests/${id}/attachment`, { responseType: 'blob' })

export const getCommission = (orderNum) => axios.get('/api/commission', { params: { orderNum } })
export const createCommission = (data) => axios.post('/api/commission', data)

export const generateDocument = (data) =>
  axios.post('/api/documents/commission', data, { responseType: 'blob' })

export const generateSampleFlow = (data) =>
  axios.post('/api/documents/sample-flow', data, { responseType: 'blob' })

export const getSalesperson = () => axios.get('/api/salespersons')
export const getSalespersonContact = (account) =>
  axios.get('/api/salespersons/contact', { params: { account } })
export const getSalespersonByCustomer = (commissioner_id) =>
  axios.get('/api/salespersons/by-customer', { params: { commissioner_id } })

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

export const prefillPayment = (commissioner_id) =>
  axios.get('/api/form/prefill-payers', { params: { commissioner_id } })

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

export const searchOrders = (q) =>
  axios.get('/api/commission/search-orders', { params: { q } })

export const checkOrder = (orderNum) =>
  axios.get('/api/commission/check-order', { params: { orderNum } })
