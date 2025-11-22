import { api } from './api';
import {
  mockLeads,
  mockCustomers,
  mockDeals,
  mockActivities,
  mockProducts,
  mockCategories,
  mockSubcategories,
  mockInvoices,
  mockOrders,
  mockNotifications,
  mockUser,
} from './mockData';

const USE_MOCK_DATA = true;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  async login(email: string, password: string) {
    if (USE_MOCK_DATA) {
      await delay(500);
      if (email && password) {
        localStorage.setItem('auth_token', 'mock-token-123');
        localStorage.setItem('user', JSON.stringify(mockUser));
        return { data: { user: mockUser, token: 'mock-token-123' } };
      }
      return { error: 'Invalid credentials' };
    }
    return api.post('/auth/login', { email, password });
  },

  async register(email: string, password: string, name: string) {
    if (USE_MOCK_DATA) {
      await delay(500);
      const newUser = { ...mockUser, email, name };
      localStorage.setItem('auth_token', 'mock-token-123');
      localStorage.setItem('user', JSON.stringify(newUser));
      return { data: { user: newUser, token: 'mock-token-123' } };
    }
    return api.post('/auth/register', { email, password, name });
  },

  async logout() {
    if (USE_MOCK_DATA) {
      await delay(300);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return { data: { success: true } };
    }
    return api.post('/auth/logout');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

export const leadsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockLeads };
    }
    return api.get('/leads');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newLead = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
      mockLeads.unshift(newLead);
      return { data: newLead };
    }
    return api.post('/leads', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockLeads.findIndex((l) => l.id === id);
      if (index !== -1) {
        mockLeads[index] = { ...mockLeads[index], ...data };
        return { data: mockLeads[index] };
      }
      return { error: 'Lead not found' };
    }
    return api.put(`/leads/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockLeads.findIndex((l) => l.id === id);
      if (index !== -1) {
        mockLeads.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Lead not found' };
    }
    return api.delete(`/leads/${id}`);
  },
};

export const customersService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockCustomers };
    }
    return api.get('/customers');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newCustomer = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
      mockCustomers.unshift(newCustomer);
      return { data: newCustomer };
    }
    return api.post('/customers', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCustomers.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCustomers[index] = { ...mockCustomers[index], ...data };
        return { data: mockCustomers[index] };
      }
      return { error: 'Customer not found' };
    }
    return api.put(`/customers/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCustomers.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCustomers.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Customer not found' };
    }
    return api.delete(`/customers/${id}`);
  },

  async getOfflineCustomers() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: [] };
    }
    return api.get('/customers/offline');
  },
};

export const dealsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockDeals };
    }
    return api.get('/deals');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newDeal = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
      mockDeals.unshift(newDeal);
      return { data: newDeal };
    }
    return api.post('/deals', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockDeals.findIndex((d) => d.id === id);
      if (index !== -1) {
        mockDeals[index] = { ...mockDeals[index], ...data };
        return { data: mockDeals[index] };
      }
      return { error: 'Deal not found' };
    }
    return api.put(`/deals/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockDeals.findIndex((d) => d.id === id);
      if (index !== -1) {
        mockDeals.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Deal not found' };
    }
    return api.delete(`/deals/${id}`);
  },
};

export const activitiesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockActivities };
    }
    return api.get('/activities');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newActivity = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
      mockActivities.unshift(newActivity);
      return { data: newActivity };
    }
    return api.post('/activities', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockActivities.findIndex((a) => a.id === id);
      if (index !== -1) {
        mockActivities[index] = { ...mockActivities[index], ...data };
        return { data: mockActivities[index] };
      }
      return { error: 'Activity not found' };
    }
    return api.put(`/activities/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockActivities.findIndex((a) => a.id === id);
      if (index !== -1) {
        mockActivities.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Activity not found' };
    }
    return api.delete(`/activities/${id}`);
  },
};

export const productsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockProducts };
    }
    return api.get('/products');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newProduct = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
      mockProducts.unshift(newProduct);
      return { data: newProduct };
    }
    return api.post('/products', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockProducts.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockProducts[index] = { ...mockProducts[index], ...data };
        return { data: mockProducts[index] };
      }
      return { error: 'Product not found' };
    }
    return api.put(`/products/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockProducts.findIndex((p) => p.id === id);
      if (index !== -1) {
        mockProducts.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Product not found' };
    }
    return api.delete(`/products/${id}`);
  },
};

export const categoriesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockCategories };
    }
    return api.get('/categories');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newCategory = { ...data, id: Date.now().toString() };
      mockCategories.unshift(newCategory);
      return { data: newCategory };
    }
    return api.post('/categories', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCategories.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCategories[index] = { ...mockCategories[index], ...data };
        return { data: mockCategories[index] };
      }
      return { error: 'Category not found' };
    }
    return api.put(`/categories/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockCategories.findIndex((c) => c.id === id);
      if (index !== -1) {
        mockCategories.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Category not found' };
    }
    return api.delete(`/categories/${id}`);
  },
};

export const subcategoriesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockSubcategories };
    }
    return api.get('/subcategories');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newSubcategory = { ...data, id: Date.now().toString() };
      mockSubcategories.unshift(newSubcategory);
      return { data: newSubcategory };
    }
    return api.post('/subcategories', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockSubcategories.findIndex((s) => s.id === id);
      if (index !== -1) {
        mockSubcategories[index] = { ...mockSubcategories[index], ...data };
        return { data: mockSubcategories[index] };
      }
      return { error: 'Subcategory not found' };
    }
    return api.put(`/subcategories/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockSubcategories.findIndex((s) => s.id === id);
      if (index !== -1) {
        mockSubcategories.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Subcategory not found' };
    }
    return api.delete(`/subcategories/${id}`);
  },
};

export const invoicesService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockInvoices };
    }
    return api.get('/invoices');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newInvoice = {
        ...data,
        id: Date.now().toString(),
        invoice_number: `INV-2025-${String(mockInvoices.length + 1).padStart(3, '0')}`,
        created_at: new Date().toISOString(),
      };
      mockInvoices.unshift(newInvoice);
      return { data: newInvoice };
    }
    return api.post('/invoices', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockInvoices.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockInvoices[index] = { ...mockInvoices[index], ...data };
        return { data: mockInvoices[index] };
      }
      return { error: 'Invoice not found' };
    }
    return api.put(`/invoices/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockInvoices.findIndex((i) => i.id === id);
      if (index !== -1) {
        mockInvoices.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Invoice not found' };
    }
    return api.delete(`/invoices/${id}`);
  },
};

export const ordersService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockOrders };
    }
    return api.get('/orders');
  },

  async create(data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const newOrder = {
        ...data,
        id: Date.now().toString(),
        order_number: `ORD-2025-${String(mockOrders.length + 1).padStart(3, '0')}`,
        created_at: new Date().toISOString(),
      };
      mockOrders.unshift(newOrder);
      return { data: newOrder };
    }
    return api.post('/orders', data);
  },

  async update(id: string, data: any) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockOrders.findIndex((o) => o.id === id);
      if (index !== -1) {
        mockOrders[index] = { ...mockOrders[index], ...data };
        return { data: mockOrders[index] };
      }
      return { error: 'Order not found' };
    }
    return api.put(`/orders/${id}`, data);
  },

  async delete(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockOrders.findIndex((o) => o.id === id);
      if (index !== -1) {
        mockOrders.splice(index, 1);
        return { data: { success: true } };
      }
      return { error: 'Order not found' };
    }
    return api.delete(`/orders/${id}`);
  },
};

export const notificationsService = {
  async getAll() {
    if (USE_MOCK_DATA) {
      await delay(300);
      return { data: mockNotifications };
    }
    return api.get('/notifications');
  },

  async markAsRead(id: string) {
    if (USE_MOCK_DATA) {
      await delay(300);
      const index = mockNotifications.findIndex((n) => n.id === id);
      if (index !== -1) {
        mockNotifications[index].is_read = true;
        return { data: mockNotifications[index] };
      }
      return { error: 'Notification not found' };
    }
    return api.put(`/notifications/${id}/read`, {});
  },

  async markAllAsRead() {
    if (USE_MOCK_DATA) {
      await delay(300);
      mockNotifications.forEach((n) => (n.is_read = true));
      return { data: { success: true } };
    }
    return api.put('/notifications/read-all', {});
  },
};
