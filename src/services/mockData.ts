export const mockLeads = [
  {
    id: '1',
    company_name: 'Tech Solutions Inc',
    contact_name: 'John Doe',
    email: 'john@techsolutions.com',
    phone: '+1-555-0101',
    status: 'new',
    source: 'website',
    notes: 'Interested in enterprise solution',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    company_name: 'Global Systems',
    contact_name: 'Jane Smith',
    email: 'jane@globalsystems.com',
    phone: '+1-555-0102',
    status: 'contacted',
    source: 'referral',
    notes: 'Follow up next week',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  },
];

export const mockCustomers = [
  {
    id: '1',
    company_name: 'Acme Corporation',
    contact_name: 'Bob Johnson',
    email: 'bob@acme.com',
    phone: '+1-555-0201',
    address: '123 Main St, City, State 12345',
    status: 'active',
    total_revenue: 50000,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    company_name: 'Widget Co',
    contact_name: 'Alice Brown',
    email: 'alice@widgetco.com',
    phone: '+1-555-0202',
    address: '456 Oak Ave, City, State 12345',
    status: 'active',
    total_revenue: 75000,
    created_at: new Date().toISOString(),
  },
];

export const mockDeals = [
  {
    id: '1',
    title: 'Enterprise Package - Tech Solutions',
    amount: 25000,
    stage: 'proposal',
    probability: 60,
    expected_close_date: '2025-12-31',
    notes: 'Waiting for approval from management',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Premium Service - Global Systems',
    amount: 15000,
    stage: 'negotiation',
    probability: 80,
    expected_close_date: '2025-11-30',
    notes: 'Price negotiations in progress',
    created_at: new Date().toISOString(),
  },
];

export const mockActivities = [
  {
    id: '1',
    related_to: 'lead',
    related_id: '1',
    type: 'call',
    title: 'Follow-up call with Tech Solutions',
    description: 'Discuss pricing and implementation timeline',
    status: 'pending',
    due_date: '2025-11-25',
    completed_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    related_to: 'customer',
    related_id: '1',
    type: 'email',
    title: 'Send quarterly report to Acme',
    description: 'Prepare and send Q4 performance report',
    status: 'completed',
    due_date: '2025-11-20',
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export const mockProducts = [
  {
    id: '1',
    name: 'Premium Water Filter',
    description: 'High-quality water filtration system',
    sku: 'WF-PREM-001',
    price: 299.99,
    cost_price: 150.0,
    stock_quantity: 45,
    low_stock_threshold: 10,
    is_active: true,
    category_id: '1',
    subcategory_id: '1',
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Standard Water Filter',
    description: 'Basic water filtration system',
    sku: 'WF-STD-001',
    price: 149.99,
    cost_price: 75.0,
    stock_quantity: 120,
    low_stock_threshold: 20,
    is_active: true,
    category_id: '1',
    subcategory_id: '1',
    image_url: null,
    created_at: new Date().toISOString(),
  },
];

export const mockCategories = [
  {
    id: '1',
    name: 'Water Filtration',
    description: 'Water filtration products and systems',
  },
  {
    id: '2',
    name: 'Accessories',
    description: 'Filters, cartridges, and replacement parts',
  },
];

export const mockSubcategories = [
  {
    id: '1',
    category_id: '1',
    name: 'Home Systems',
    description: 'Residential water filtration systems',
  },
  {
    id: '2',
    category_id: '1',
    name: 'Commercial Systems',
    description: 'Commercial-grade water filtration',
  },
];

export const mockInvoices = [
  {
    id: '1',
    invoice_number: 'INV-2025-001',
    customer_name: 'Acme Corporation',
    customer_email: 'bob@acme.com',
    customer_phone: '+1-555-0201',
    customer_address: '123 Main St, City, State 12345',
    items: [
      {
        id: '1',
        product_id: '1',
        product_name: 'Premium Water Filter',
        quantity: 10,
        unit_price: 299.99,
        total: 2999.9,
      },
    ],
    subtotal: 2999.9,
    tax: 239.99,
    total: 3239.89,
    payment_status: 'paid',
    status: 'paid',
    issue_date: '2025-11-01',
    due_date: '2025-11-30',
    notes: 'Thank you for your business',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    invoice_number: 'INV-2025-002',
    customer_name: 'Widget Co',
    customer_email: 'alice@widgetco.com',
    customer_phone: '+1-555-0202',
    customer_address: '456 Oak Ave, City, State 12345',
    items: [
      {
        id: '2',
        product_id: '2',
        product_name: 'Standard Water Filter',
        quantity: 20,
        unit_price: 149.99,
        total: 2999.8,
      },
    ],
    subtotal: 2999.8,
    tax: 239.98,
    total: 3239.78,
    payment_status: 'pending',
    status: 'sent',
    issue_date: '2025-11-15',
    due_date: '2025-12-15',
    notes: 'Net 30 payment terms',
    created_at: new Date().toISOString(),
  },
];

export const mockOrders = [
  {
    id: '1',
    order_number: 'ORD-2025-001',
    customer_name: 'Acme Corporation',
    customer_email: 'bob@acme.com',
    customer_phone: '+1-555-0201',
    customer_address: '123 Main St, City, State 12345',
    items: [
      {
        id: '1',
        product_id: '1',
        product_name: 'Premium Water Filter',
        quantity: 5,
        unit_price: 299.99,
        total: 1499.95,
      },
    ],
    subtotal: 1499.95,
    tax: 119.99,
    total: 1619.94,
    payment_status: 'paid',
    status: 'delivered',
    order_date: '2025-11-10',
    delivery_date: '2025-11-15',
    notes: 'Express delivery requested',
    created_at: new Date().toISOString(),
  },
];

export const mockNotifications = [
  {
    id: '1',
    type: 'info',
    title: 'New Lead',
    message: 'New lead from website: Tech Solutions Inc',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Stock Alert',
    message: 'Premium Water Filter stock is running low',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    type: 'success',
    title: 'Payment Received',
    message: 'Payment received for Invoice INV-2025-001',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const mockUser = {
  id: '1',
  email: 'user@example.com',
  name: 'Demo User',
};
