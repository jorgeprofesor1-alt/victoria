import { api } from './api';

export interface CreateOrderPayload {
  nombreCliente: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  metodoEnvio: string;
  metodoPago: string;
  notas?: string;
  aceptaHabeasData: boolean;
  items: { productoId: string; cantidad: number }[];
}

export const orderService = {
  createOrder: async (orderData: CreateOrderPayload) => {
    const { data } = await api.post('/pedidos', orderData);
    return data;
  },
  getOrders: async (estado?: string) => {
    const params = estado ? { estado } : {};
    const { data } = await api.get('/admin/pedidos', { params });
    return data;
  },
  getOrderById: async (id: string) => {
    const { data } = await api.get(`/admin/pedidos/${id}`);
    return data;
  },
  updateOrderStatus: async (id: string, estado: string) => {
    const { data } = await api.patch(`/admin/pedidos/${id}/estado`, { estado });
    return data;
  },
  uploadComprobante: async (codigo: string, file: File, telefono?: string) => {
    const formData = new FormData();
    formData.append('comprobante', file);
    if (telefono) {
      formData.append('telefono', telefono);
    }
    const { data } = await api.post(`/pedidos/${encodeURIComponent(codigo)}/comprobante`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  trackOrders: async (codigo: string, telefono: string) => {
    const { data } = await api.get('/pedidos/rastreo', {
      params: {
        codigo: (codigo || '').trim(),
        telefono: (telefono || '').trim(),
      },
    });
    return data;
  },
  getAdminComprobanteBlob: async (
    orderId: string,
  ): Promise<{
    blobUrl: string;
    mimeType: string;
    isPdf: boolean;
    revoke: () => void;
  }> => {
    const response = await api.get(`/admin/pedidos/${orderId}/comprobante`, {
      responseType: 'blob',
    });
    const mimeType = (response.headers['content-type'] as string) || '';
    const isPdf = mimeType.includes('pdf');
    const blobUrl = URL.createObjectURL(response.data);
    return {
      blobUrl,
      mimeType,
      isPdf,
      revoke: () => URL.revokeObjectURL(blobUrl),
    };
  },
};
