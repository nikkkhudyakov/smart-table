import { makeIndex } from './lib/utils.js';

export function initData(sourceData) {
  const BASE_URL = 'https://webinars.webdev.education-services.ru/sp7-api';

  // локальные индексы для мок-режима и начальной инициализации
  const localSellers = makeIndex(
    sourceData.sellers,
    'id',
    (v) => `${v.first_name} ${v.last_name}`
  );
  const localCustomers = makeIndex(
    sourceData.customers,
    'id',
    (v) => `${v.first_name} ${v.last_name}`
  );
  const localData = sourceData.purchase_records.map((item) => ({
    id: item.receipt_id,
    date: item.date,
    seller: localSellers[item.seller_id],
    customer: localCustomers[item.customer_id],
    total: item.total_amount,
  }));

  // кеш
  let sellers;
  let customers;
  let lastResult;
  let lastQuery;

  const mapRecords = (records) =>
    records.map((item) => ({
      id: item.receipt_id,
      date: item.date,
      seller: sellers[item.seller_id],
      customer: customers[item.customer_id],
      total: item.total_amount,
    }));

  const getIndexes = async () => {
    if (!sellers || !customers) {
      try {
        [sellers, customers] = await Promise.all([
          fetch(`${BASE_URL}/sellers`).then((res) => res.json()),
          fetch(`${BASE_URL}/customers`).then((res) => res.json()),
        ]);
      } catch (e) {
        sellers = localSellers;
        customers = localCustomers;
      }
    }
    return { sellers, customers };
  };

  const getRecords = async (query = {}, isUpdated = false) => {
    const qs = new URLSearchParams(query);
    const nextQuery = qs.toString();

    if (lastQuery === nextQuery && !isUpdated && lastResult) {
      return lastResult;
    }

    try {
      const response = await fetch(`${BASE_URL}/records?${nextQuery}`);
      const records = await response.json();
      lastQuery = nextQuery;
      lastResult = {
        total: records.total,
        items: mapRecords(records.items),
      };
      return lastResult;
    } catch (e) {
      // fallback на локальные данные
      lastQuery = nextQuery;
      lastResult = {
        total: localData.length,
        items: localData,
      };
      return lastResult;
    }
  };

  return {
    getIndexes,
    getRecords,
  };
}
