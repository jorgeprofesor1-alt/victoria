import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { MapPin, Clock } from 'lucide-react';

export const ShippingPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-base flex flex-col text-gray-200">
      <Navbar />
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-16 w-full">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-8">Políticas de Envío</h1>
        
        <div className="space-y-12">
          <section className="bg-dark-surface border border-dark-border p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-volt" />
              <h2 className="text-2xl font-bold text-white">Cobertura Exclusiva en Pasto - ¡Envío 100% Gratis!</h2>
            </div>
            <p className="text-gray-400 leading-relaxed mb-4">
              Nuestra tienda opera de forma exclusiva para la <strong>ciudad de Pasto (Nariño)</strong>. Brindamos entregas directas a domicilio sin intermediarios para asegurar la máxima frescura y rapidez.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li><strong>Costo de envío:</strong> $0 COP (Envío totalmente gratis en toda la ciudad).</li>
              <li><strong>Horario de corte:</strong> Pedidos confirmados antes de las 2:00 PM se entregan el mismo día.</li>
              <li><strong>Entrega directa:</strong> Coordinamos la entrega directamente a tu casa, gimnasio o lugar de entrenamiento.</li>
            </ul>
          </section>

          <section className="bg-dark-surface border border-dark-border p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-volt" />
              <h2 className="text-2xl font-bold text-white">Tiempos de Entrega y Soporte</h2>
            </div>
            <p className="text-gray-400 leading-relaxed mb-4">
              Los tiempos de entrega en Pasto son de <strong>pocas horas hábiles</strong>. Una vez registrado tu pedido en la web, nuestro canal oficial de WhatsApp te mantendrá al tanto en tiempo real hasta que el producto esté en tus manos.
            </p>
            <a
              href="https://wa.me/573224197485?text=Hola,%20tengo%20una%20pregunta%20sobre%20las%20entregas%20en%20Pasto."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-volt text-dark-base font-bold text-xs uppercase tracking-wider hover:bg-volt-hover transition-colors shadow-md"
            >
              Consultar por WhatsApp
            </a>
          </section>
        </div>
      </main>
    </div>
  );
};
