# Чек-лист проверки механизма очистки телеметрии

## ✅ Что уже проверено автоматически:

1. **Компиляция TypeScript** - ✅ Без ошибок
2. **Сборка проекта (npm run build)** - ✅ Успешно
3. **Все файлы созданы** - ✅
   - telemetry-cleanup.service.ts
   - telemetry-admin.controller.ts
   - Обновлен telemetry.module.ts
   - Обновлен app.module.ts
   - Добавлена конфигурация в .env

## 📝 Что нужно проверить после перезапуска:

### 1. Проверка инициализации сервиса

После запуска `npm run start:dev` проверьте логи на наличие:

```
[TelemetryCleanupService] TelemetryCleanupService initialized with 10 days retention
```

Это подтвердит, что сервис загрузился и прочитал конфигурацию.

### 2. Проверка API endpoints

```bash
# Получить JWT токен (сначала залогиньтесь)
TOKEN="your_jwt_token_here"

# Проверить статистику
curl -X GET http://localhost:3000/admin/telemetry/cleanup/stats \
  -H "Authorization: Bearer $TOKEN"

# Должен вернуть:
{
  "totalCount": 0,
  "oldCount": 0,
  "recentCount": 0,
  "retentionDays": 10,
  "cutoffDate": "2025-12-06T..."
}
```

### 3. Проверка ручного запуска очистки

```bash
curl -X POST http://localhost:3000/admin/telemetry/cleanup/manual \
  -H "Authorization: Bearer $TOKEN"

# Должен вернуть:
{
  "success": true,
  "deletedCount": 0,
  "cutoffDate": "2025-12-06T..."
}
```

### 4. Проверка Swagger документации

Откройте http://localhost:3000/api

В разделе "admin/telemetry" должны быть два новых endpoint:
- GET /admin/telemetry/cleanup/stats
- POST /admin/telemetry/cleanup/manual

## 🔧 Если что-то не работает:

### Проблема: Сервис не инициализируется

**Решение:**
1. Убедитесь что сервер перезапущен после изменений
2. Проверьте что `ScheduleModule.forRoot()` есть в app.module.ts
3. Проверьте что `TelemetryCleanupService` в providers в telemetry.module.ts

### Проблема: API endpoints не работают

**Решение:**
1. Проверьте что вы используете валидный JWT токен
2. Убедитесь что `TelemetryAdminController` в controllers в telemetry.module.ts
3. Проверьте что JwtAuthGuard работает корректно

### Проблема: TELEMETRY_RETENTION_DAYS не читается

**Решение:**
1. Проверьте что переменная добавлена в .env
2. Перезапустите сервер
3. Проверьте что ConfigModule.forRoot({ isGlobal: true }) в app.module.ts

## ⏰ Автоматическая очистка

Cron задача запустится автоматически **каждый день в 3:00 AM**.

Чтобы проверить что она работает, можно временно изменить расписание в файле:
`src/telemetry/telemetry-cleanup.service.ts`

Замените:
```typescript
@Cron(CronExpression.EVERY_DAY_AT_3AM)
```

На (для теста - каждую минуту):
```typescript
@Cron(CronExpression.EVERY_MINUTE)
```

**НЕ ЗАБУДЬТЕ ВЕРНУТЬ ОБРАТНО ПОСЛЕ ТЕСТА!**

## 📊 Мониторинг

Рекомендуется добавить мониторинг логов:

```bash
# Следить за логами очистки
tail -f logs/application.log | grep TelemetryCleanupService
```

## ✅ Итоговый чеклист

- [ ] Сервер успешно запускается без ошибок
- [ ] В логах есть сообщение об инициализации TelemetryCleanupService
- [ ] API endpoint /admin/telemetry/cleanup/stats работает
- [ ] API endpoint /admin/telemetry/cleanup/manual работает
- [ ] Endpoints видны в Swagger документации
- [ ] После создания тестовой телеметрии, ручная очистка удаляет старые записи

## 🎯 Резюме

**Ошибок компиляции:** 0
**TypeScript ошибок:** 0
**Сборка проекта:** ✅ Успешно
**Все файлы созданы:** ✅ Да

**Требуется перезапуск:** ✅ ДА - чтобы изменения вступили в силу

Просто выполните:
```bash
npm run start:dev
```

Или если используете PM2/Docker - перезапустите контейнер/процесс.
