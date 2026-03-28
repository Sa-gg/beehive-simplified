# BEEHIVE System Simplification Audit

## Overview
This audit identifies all features to **REMOVE** for client deployment. The client needs:
- ✅ Dashboard
- ✅ Cashier/Manager roles
- ✅ POS
- ✅ Inventory
- ✅ Sales monitoring
- ✅ Receipt printing (customer & kitchen)

**Features to REMOVE:**
- ❌ Customer landing page & self-ordering
- ❌ Mood-based menu recommendations (capstone innovation)
- ❌ Loyalty system (experimental)

---

## 1. DATABASE CHANGES (Prisma Schema)

### Tables to DROP
| Table | Purpose | Location |
|-------|---------|----------|
| `mood_settings` | Mood configuration per mood type | schema.prisma:297-315 |
| `mood_feedback_config` | Algorithm weights & settings | schema.prisma:319-346 |
| `mood_order_stats` | Aggregate mood order statistics | schema.prisma:350-365 |
| `menu_item_mood_stats` | Per-item mood performance | schema.prisma:367-385 |

### Enum to REMOVE
| Enum | Location |
|------|----------|
| `mood_type` | schema.prisma (HAPPY, SAD, STRESSED, etc.) |

### Fields to REMOVE from Existing Tables
| Table | Field | Type |
|-------|-------|------|
| `menu_items` | `moodBenefits` | String? |
| `orders` | `moodContext` | String? |
| `orders` | `moodFeedbackGiven` | Boolean |

### Fields to CONSIDER Removing (Optional)
| Table | Field | Notes |
|-------|-------|-------|
| `users` | `loyaltyPoints` | Can keep if simple customer tracking needed |

---

## 2. BACKEND FILES

### Files to DELETE Completely
| File | Purpose | Verified |
|------|---------|----------|
| `src/controllers/moodSettings.controller.ts` | Mood system API endpoints | ✅ |
| `src/routes/moodSettings.routes.ts` | Mood system routing | ✅ |
| `src/repositories/moodSettings.repository.ts` | Mood data access | ✅ |
| `src/controllers/loyalty.controller.ts` | Loyalty/stamp card system | ✅ |
| `src/routes/loyalty.routes.ts` | Loyalty routing | ✅ |
| `src/services/loyalty.service.ts` | Loyalty business logic | ✅ |
| `src/repositories/loyalty.repository.ts` | Loyalty data access | ✅ |
| `src/controllers/customers.controller.ts` | Customer self-service | ✅ |
| `src/services/customers.service.ts` | Customer business logic | ✅ |
| `src/repositories/customers.repository.ts` | Customer data access | ✅ |
| `scripts/migrate-mood-benefits.ts` | Migration script | ✅ |
| `scripts/clear-mood-stats.ts` | Mood stats clearing script | ✅ |

**Note:** No dedicated `moodSettings.service.ts` exists - logic is in repository

### Files to MODIFY
| File | Changes Needed |
|------|----------------|
| `prisma/schema.prisma` | Remove mood tables, enum, fields |
| `prisma/seed.ts` | Remove `seedMoodSettings()` function and call |
| `src/routes/index.ts` | Remove mood & loyalty route imports/registrations |
| `src/services/order.service.ts` | Remove moodContext handling |
| `src/services/menuItem.service.ts` | Remove moodBenefits handling |
| `src/controllers/menuItem.controller.ts` | Remove moodBenefits from responses |

### Backup Files to DELETE
| Folder | Contents |
|--------|----------|
| `backups/*/mood_settings.json` | Mood backup data |
| `backups/*/mood_feedback_config.json` | Mood config backups |
| `backups/*/mood_order_stats.json` | Mood stats backups |
| `backups/*/menu_item_mood_stats.json` | Item mood stats |

---

## 3. FRONTEND FILES

### Pages to DELETE
| File | Purpose |
|------|---------|
| `pages/client/HomePage.tsx` | Customer landing page |
| `pages/client/MenuPage.tsx` | Customer menu browsing & ordering |
| `pages/client/AboutPage.tsx` | About page |
| `pages/admin/MoodSettingsPage.tsx` | Mood system admin dashboard |
| `pages/admin/LoyaltyPage.tsx` | Loyalty card management |
| `pages/QRConnectPage.tsx` | QR code connection page |

### Component Folders to DELETE
| Folder | Contents |
|--------|----------|
| `components/features/CustomerMenu/` | 9 files: CartDrawer, CheckoutForm, MoodSelector, MoodReflectionModal, MoodRecommendationCard, etc. |
| `components/features/Loyalty/` | LoyaltyCard.tsx |

### Utility Files to DELETE
| File | Purpose |
|------|---------|
| `shared/utils/moodRecommendations.ts` | Mood recommendation algorithm |
| `shared/utils/moodSystem.ts` | Mood configuration & helpers |
| `shared/utils/nutritionalBenefits.ts` | Mood-nutrient mappings |

### API Files to DELETE
| File | Purpose | Verified |
|------|---------|----------|
| `infrastructure/api/moodSettings.api.ts` | Mood API client | ✅ |
| `infrastructure/api/loyalty.api.ts` | Loyalty API client | ✅ |
| `infrastructure/api/customers.api.ts` | Customer self-service API | ✅ |

### Public Files to DELETE
| File | Purpose |
|------|---------|
| `public/qr-connect.html` | QR connection page |
| `public/wifi-qr.html` | WiFi QR page |
| `mdns-server.js` | mDNS discovery for customer devices |

### Files to MODIFY
| File | Changes Needed |
|------|----------------|
| `routes/index.tsx` | Remove client routes, mood-settings route, loyalty route |
| `components/layout/AdminLayout.tsx` | Remove "Mood System" and "Loyalty" from `allMenuItems` array |
| `store/settingsStore.ts` | Remove `loyaltySystemEnabled` state & setter |
| `store/authStore.ts` | Remove mood-related state if any |

---

## 4. NAVIGATION CHANGES

### AdminLayout Menu Items to REMOVE
From `AdminLayout.tsx` `allMenuItems` array:
```tsx
// REMOVE these items:
{ outlineIcon: Brain, solidIcon: RiBrainFill, label: 'Mood System', path: '/admin/mood-settings', ... },
{ outlineIcon: Coffee, solidIcon: RiCupFill, label: 'Loyalty', path: '/admin/loyalty', ... },
```

### Permission to REMOVE
From `DEFAULT_PERMISSIONS`:
- Remove `manageMoodSettings: true` from MANAGER and ADMIN roles

---

## 5. ROUTES SUMMARY

### Backend Routes to REMOVE
| Route Pattern | File |
|--------------|------|
| `/api/mood-settings/*` | moodSettings.routes.ts |
| `/api/loyalty/*` | loyalty.routes.ts |
| `/api/customers/*` | customers routes (if separate) |

### Frontend Routes to REMOVE
| Path | Component |
|------|-----------|
| `/` | HomePage (client landing) |
| `/menu` | MenuPage (customer ordering) |
| `/about` | AboutPage |
| `/qr-connect` | QRConnectPage |
| `/admin/mood-settings` | MoodSettingsPage |
| `/admin/loyalty` | LoyaltyPage |

---

## 6. DOCUMENTATION TO UPDATE

| File | Changes |
|------|---------|
| `MOOD_RECOMMENDATION_ALGORITHM.md` | DELETE entirely |
| `documents/MOOD_RECOMMENDATION_ALGORITHM.md` | DELETE entirely |
| `MOOD_BENEFITS_MIGRATION_SUMMARY.md` | DELETE entirely |
| `API_DOCUMENTATION.md` | Remove mood & loyalty endpoints |
| `AUTH_README.md` | Remove CUSTOMER role details, loyalty mentions |
| `README.md` | Update features list |
| `ARCHITECTURE.md` | Remove mood system references |

---

## 7. ESTIMATED IMPACT

### Files to DELETE: ~35-40 files
### Files to MODIFY: ~15-20 files
### Database tables to DROP: 4
### Database fields to REMOVE: 3-4
### Routes to REMOVE: ~15-20 endpoints

---

## 8. IMPLEMENTATION ORDER (Recommended)

1. **Phase 1: Backend Database** (High Risk)
   - Create database backup
   - Update Prisma schema
   - Generate migration
   - Apply migration

2. **Phase 2: Backend Code**
   - Remove route registrations
   - Delete service/controller/repository files
   - Update remaining services to remove mood references

3. **Phase 3: Frontend Pages**
   - Update routes/index.tsx
   - Delete page components
   - Delete feature components

4. **Phase 4: Frontend Cleanup**
   - Update AdminLayout navigation
   - Remove utility files
   - Update stores

5. **Phase 5: Documentation**
   - Update/delete documentation files
   - Clean up backup folders

---

## 9. VERIFICATION CHECKLIST

After removal, verify:
- [ ] Backend starts without errors
- [ ] Frontend builds without errors
- [ ] Admin login works
- [ ] Dashboard loads
- [ ] POS functions correctly
- [ ] Orders work (create, update, print)
- [ ] Inventory management works
- [ ] Sales reports work
- [ ] No 404 errors in navigation
- [ ] Database has no orphaned data

---

**⚠️ IMPORTANT: Create full database backup before any changes!**

*Audit generated: Ready for implementation when approved.*
