# Telemetry Data Cleanup System

## Обзор

Система автоматической очистки телеметрии предотвращает бесконечный рост базы данных, удаляя старые записи из таблицы `telemetry_points`.

## Конфигурация

### Переменные окружения (.env)

```env
TELEMETRY_RETENTION_DAYS=10
```

**TELEMETRY_RETENTION_DAYS** - количество дней хранения телеметрии (по умолчанию: 10 дней)

## Автоматическая очистка

### Расписание

Cron-задача запускается **каждый день в 3:00 AM** и удаляет все записи телеметрии старше `TELEMETRY_RETENTION_DAYS` дней.

### Логирование

Сервис записывает в лог следующую информацию:
- Время запуска очистки
- Дата отсечки (cutoff date)
- Количество удаленных записей
- Количество оставшихся записей
- Ошибки (если произошли)

Пример лога:
```
[TelemetryCleanupService] TelemetryCleanupService initialized with 10 days retention
[TelemetryCleanupService] Starting telemetry cleanup task...
[TelemetryCleanupService] Deleting telemetry points older than 2025-12-06T03:00:00.000Z
[TelemetryCleanupService] Successfully deleted 15420 old telemetry points
[TelemetryCleanupService] Remaining telemetry points in database: 8932
```

## Ручное управление

### API Endpoints

#### 1. Получить статистику

**GET** `/admin/telemetry/cleanup/stats`

**Authorization:** Bearer Token (JWT)

**Ответ:**
```json
{
  "totalCount": 24352,
  "oldCount": 15420,
  "recentCount": 8932,
  "retentionDays": 10,
  "cutoffDate": "2025-12-06T12:00:00.000Z"
}
```

**Описание полей:**
- `totalCount` - общее количество записей телеметрии
- `oldCount` - количество записей, которые будут удалены при очистке
- `recentCount` - количество записей, которые будут сохранены
- `retentionDays` - текущий период хранения (из конфигурации)
- `cutoffDate` - дата отсечки

#### 2. Запустить ручную очистку

**POST** `/admin/telemetry/cleanup/manual`

**Authorization:** Bearer Token (JWT)

**Query Parameters (опционально):**
- `days` - переопределить период хранения для этой очистки

**Примеры:**

Очистка с настройками по умолчанию (10 дней):
```bash
POST /admin/telemetry/cleanup/manual
```

Очистка с пользовательским периодом (30 дней):
```bash
POST /admin/telemetry/cleanup/manual?days=30
```

**Ответ:**
```json
{
  "success": true,
  "deletedCount": 15420,
  "cutoffDate": "2025-12-06T12:00:00.000Z"
}
```

## Примеры использования

### Curl

```bash
# Получить статистику
curl -X GET http://localhost:3000/admin/telemetry/cleanup/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Запустить ручную очистку
curl -X POST http://localhost:3000/admin/telemetry/cleanup/manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Запустить очистку с пользовательским периодом
curl -X POST "http://localhost:3000/admin/telemetry/cleanup/manual?days=30" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript/TypeScript

```typescript
// Получить статистику
const stats = await fetch('http://localhost:3000/admin/telemetry/cleanup/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await stats.json();
console.log(`Будет удалено ${data.oldCount} записей`);

// Запустить ручную очистку
const cleanup = await fetch('http://localhost:3000/admin/telemetry/cleanup/manual', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const result = await cleanup.json();
console.log(`Удалено ${result.deletedCount} записей`);
```

## Рекомендации

### Период хранения

- **Минимум 7 дней** - для отладки и анализа недавних событий
- **10-30 дней** (рекомендуется) - баланс между хранением истории и экономией места
- **60-90 дней** - если требуется длительный анализ или для соответствия требованиям

### Мониторинг

Рекомендуется регулярно проверять статистику:

```bash
# Добавить в crontab для еженедельного отчета
0 9 * * 1 curl -X GET http://localhost:3000/admin/telemetry/cleanup/stats \
  -H "Authorization: Bearer $TOKEN" >> /var/log/telemetry-stats.log
```

### Производительность

При большом объеме данных (>1 млн записей):
- Очистка запускается в 3:00 AM когда нагрузка минимальна
- Операция выполняется в одной транзакции
- PostgreSQL эффективно удаляет данные благодаря индексу на `timestamp`

### Резервное копирование

Перед изменением `TELEMETRY_RETENTION_DAYS` на меньшее значение:

1. Сделайте резервную копию БД
2. Проверьте статистику
3. При необходимости экспортируйте старые данные

## Технические детали

### Файлы

- [telemetry-cleanup.service.ts](../src/telemetry/telemetry-cleanup.service.ts) - сервис очистки
- [telemetry-admin.controller.ts](../src/telemetry/telemetry-admin.controller.ts) - admin API
- [.env](../.env) - конфигурация

### Индексы

Очистка использует индекс на `telemetry_points.timestamp` для быстрого поиска старых записей.

### Безопасность

- Все admin endpoints защищены JWT аутентификацией
- Требуется роль PARENT или выше
- Операции логируются

## Устранение проблем

### Очистка не запускается

1. Проверьте, что `ScheduleModule` зарегистрирован в `app.module.ts`
2. Проверьте логи на наличие ошибок
3. Убедитесь, что сервер запущен в момент выполнения cron

### Медленная очистка

1. Проверьте наличие индекса: `CREATE INDEX IF NOT EXISTS "telemetry_points_timestamp_idx" ON "telemetry_points"("timestamp")`
2. Рассмотрите партиционирование таблицы
3. Увеличьте `work_mem` в PostgreSQL для больших удалений

### Недостаточно места освобождается

1. PostgreSQL не сразу возвращает место ОС после DELETE
2. Запустите `VACUUM FULL telemetry_points;` для полной очистки
3. Настройте автоматический VACUUM в PostgreSQL
