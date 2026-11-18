"use client";

import { useState, FormEvent } from "react";
import { BAKERY } from "@/config/bakeryOptions";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const OCCASIONS = [
  "Medovik Clásico (Mediano ~1.22 kg · $500 MXN)",
  "Medovik Clásico (Grande ~2.45 kg · $1,000 MXN)",
  "Medovik Spartak Cacao & Ciruela (Mediano ~1.22 kg · $600 MXN)",
  "Medovik Spartak Cacao & Ciruela (Grande ~2.45 kg · $1,200 MXN)",
  "Medovik Caramelo Salado & Pecana (Mediano ~1.22 kg · $600 MXN)",
  "Medovik Caramelo Salado & Pecana (Grande ~2.45 kg · $1,200 MXN)",
  "Porciones Individuales (~180 g · $100 MXN c/u)",
  "Trilogía 3 Porciones Degustación ($300 MXN)",
  "Evento especial / Mesa de postres en Mérida",
];

interface EmailContactFormProps {
  whatsappPhone?: string;
}

export default function EmailContactForm({ whatsappPhone }: EmailContactFormProps = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const buildOrderText = () => {
    const lines = [
      `🍯 *Consulta de pedido — ${BAKERY.name}*`,
      "",
      `• *Nombre:* ${name}`,
      phone ? `• *Teléfono / WhatsApp:* ${phone}` : null,
      email ? `• *Correo:* ${email}` : null,
      `• *Sabor / Presentación:* ${occasion}`,
      date ? `• *Fecha deseada en Mérida:* ${date}` : null,
      "",
      "*Comentarios o detalles:*",
      message,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const waUrl = buildWhatsAppUrl(buildOrderText(), whatsappPhone);
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  const inputClasses =
    "w-full rounded-xl border border-dorado-suave/80 bg-blanco-calido px-4 py-3 text-sm text-cacao placeholder-cacao-suave/60 shadow-2xs transition focus:border-rosa-profundo focus:outline-none focus:ring-2 focus:ring-rosa-profundo/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="mb-2">
        <h3 className="font-serif text-xl font-bold text-cacao sm:text-2xl">
          Cotiza o reserva tu fecha en Mérida
        </h3>
        <p className="mt-1 text-xs text-cacao-suave sm:text-sm">
          Completa los datos de tu pastel y al enviar se abrirá WhatsApp con tu solicitud lista para confirmar con nuestra cocina.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1.5 block text-xs font-semibold tracking-wide uppercase text-cacao"
          >
            Tu nombre *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Sofía Hernández"
            className={inputClasses}
          />
        </div>

        <div>
          <label
            htmlFor="contact-phone"
            className="mb-1.5 block text-xs font-semibold tracking-wide uppercase text-cacao"
          >
            Tu WhatsApp / Teléfono *
          </label>
          <input
            id="contact-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="999 000 0000"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-occasion"
            className="mb-1.5 block text-xs font-semibold tracking-wide uppercase text-cacao"
          >
            Sabor y tamaño de interés
          </label>
          <select
            id="contact-occasion"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className={inputClasses}
          >
            {OCCASIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="contact-date"
            className="mb-1.5 block text-xs font-semibold tracking-wide uppercase text-cacao"
          >
            Fecha deseada
          </label>
          <input
            id="contact-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="mb-1.5 block text-xs font-semibold tracking-wide uppercase text-cacao"
        >
          Correo electrónico (opcional)
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className={inputClasses}
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-xs font-semibold tracking-wide uppercase text-cacao"
        >
          Detalles de tu pedido (colonia en Mérida, dedicatoria o dudas) *
        </label>
        <textarea
          id="contact-message"
          rows={3}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos para cuántas personas es tu reunión, en qué zona de Mérida te encuentras o si deseas combinar porciones..."
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-cacao-suave">
          Envío directo al WhatsApp{" "}
          <span className="font-semibold text-cacao">+52 {BAKERY.phone}</span>
        </p>

        <button
          type="submit"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cacao px-7 py-3.5 text-sm font-semibold text-blanco-calido shadow-md transition-all hover:-translate-y-0.5 hover:bg-rosa-profundo hover:shadow-lg"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span>Enviar solicitud por WhatsApp</span>
        </button>
      </div>

      {submitted && (
        <p
          role="status"
          className="rounded-xl border border-dorado/40 bg-crema px-4 py-3 text-xs text-cacao"
        >
          Se abrió WhatsApp con los datos de tu pedido. Si no se abrió automáticamente, escríbenos directo al{" "}
          <a
            href={`https://wa.me/${BAKERY.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-rosa-profundo underline"
          >
            +52 {BAKERY.phone}
          </a>
          .
        </p>
      )}
    </form>
  );
}
