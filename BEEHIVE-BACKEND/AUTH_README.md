# Authentication System

## Overview
Complete authentication and authorization system with 4 user roles:
- **Customer** - Loyalty points and card system
- **Cashier** - POS operations
- **Cook** - View orders
- **Manager** - Full system access

## Features
✅ JWT-based authentication
✅ Role-based access control (RBAC)
✅ Password hashing with bcrypt
✅ Loyalty points system for customers
✅ Automatic card number generation
✅ Token expiration (7 days)
✅ Protected routes

## API Endpoints

### Public Routes

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "CUSTOMER", // optional: CUSTOMER, CASHIER, COOK, MANAGER
  "phone": "+1234567890" // optional
}
```

**Response:**
```json
{
  "user": {
    "id": "user-xxx",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "loyaltyPoints": 0,
    "cardNumber": "BH12345678",
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Routes (Require Authentication)

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Manager Only Routes

#### Get All Users
```http
GET /api/auth/users
Authorization: Bearer <token>

Optional query params:
- role: CUSTOMER | CASHIER | COOK | MANAGER
```

#### Get User by ID
```http
GET /api/auth/users/:id
Authorization: Bearer <token>
```

#### Update User
```http
PUT /api/auth/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone": "+9876543210",
  "password": "newpassword123", // optional
  "loyaltyPoints": 100, // optional
  "isActive": true // optional
}
```

#### Delete User
```http
DELETE /api/auth/users/:id
Authorization: Bearer <token>
```

### Manager & Cashier Routes

#### Add Loyalty Points
```http
POST /api/auth/loyalty-points
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-xxx",
  "points": 50
}
```

## Default Users

After running the seed script, these default users are available:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Manager | manager@beehive.com | password123 | Full access |
| Cashier | cashier@beehive.com | password123 | POS, Loyalty points |
| Cook | cook@beehive.com | password123 | View orders |
| Customer | customer@beehive.com | password123 | Place orders, View points |

## Usage in Frontend

### 1. Login
```typescript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'cashier@beehive.com',
    password: 'password123'
  })
});

const { user, token } = await response.json();
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));
```

### 2. Make Authenticated Requests
```typescript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const user = await response.json();
```

### 3. Check User Role
```typescript
const user = JSON.parse(localStorage.getItem('user'));

if (user.role === 'MANAGER') {
  // Show admin features
} else if (user.role === 'CASHIER') {
  // Show POS features
} else if (user.role === 'COOK') {
  // Show kitchen display
}
```

## Security Features

1. **Password Hashing**: bcrypt with salt rounds = 10
2. **JWT Tokens**: 7-day expiration
3. **Role-based Authorization**: Middleware checks user roles
4. **Input Validation**: Email format, password length (min 6 chars)
5. **Duplicate Prevention**: Unique email and card numbers

## Database Schema

```prisma
model users {
  id            String     @id
  email         String     @unique
  password      String
  name          String
  role          user_role  @default(CUSTOMER)
  phone         String?
  loyaltyPoints Int        @default(0)
  cardNumber    String?    @unique
  isActive      Boolean    @default(true)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime
  lastLoginAt   DateTime?
}

enum user_role {
  CUSTOMER
  CASHIER
  COOK
  MANAGER
}
```

## Environment Variables

Add to `.env`:
```env
JWT_SECRET=your-secret-key-change-in-production
```

## Error Handling

Common errors:
- `400`: Invalid input, duplicate email
- `401`: Invalid credentials, expired token
- `403`: Insufficient permissions
- `404`: User not found

## Role Permissions

| Action | Customer | Cashier | Cook | Manager |
|--------|----------|---------|------|---------|
| Login | ✅ | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Place orders | ✅ | ✅ | ❌ | ✅ |
| POS operations | ❌ | ✅ | ❌ | ✅ |
| View all orders | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Add loyalty points | ❌ | ✅ | ❌ | ✅ |
