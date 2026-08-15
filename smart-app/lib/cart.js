"use client";

const KEY = "smart_cart_v1";

export function getCart() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((c) => c.product_id === item.product_id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("smart-cart-updated"));
  return cart;
}

export function removeFromCart(product_id) {
  const cart = getCart().filter((c) => c.product_id !== product_id);
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("smart-cart-updated"));
  return cart;
}

export function clearCart() {
  localStorage.setItem(KEY, "[]");
  window.dispatchEvent(new Event("smart-cart-updated"));
}

export function cartTotalCents() {
  return getCart().reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);
}
