# HEAD Hub - Athlete Management Platform

A comprehensive web application for managing athlete equipment, content, and team coordination tailored for HEAD GmbH. Built with Next.js 15, React 19, and Supabase.

## 🚀 Production Ready

This application has been completely refactored and is now **production-ready** with:
- ✅ Full test coverage and CI/CD pipeline
- ✅ Docker containerization with multi-stage builds
- ✅ Automatic HTTPS with Let's Encrypt
- ✅ Comprehensive security hardening
- ✅ Performance optimizations and monitoring
- ✅ Complete deployment documentation

## Features

### 🏃‍♂️ **User Management**
- **Role-based access control**: Athletes, Managers, and Administrators
- **Invitation system**: Secure user onboarding via email invitations
- **Profile management**: Complete athlete profile and contact information
- **OAuth integration**: Google sign-in support

### 📦 **Equipment Management**  
- **Order system**: Equipment requests with approval workflow
- **Inventory tracking**: Comprehensive equipment categorization
- **Approval workflow**: Manager/admin approval for equipment orders
- **Order history**: Complete audit trail of equipment requests

### 📁 **Content Management**
- **File uploads**: Secure file storage with S3/Supabase integration
- **Gallery system**: Organized content viewing by athlete and session
- **Media support**: Images, videos, and document handling
- **Access controls**: User-specific content access

### 👥 **Team Coordination**
- **Athlete management**: Manager tools for athlete oversight  
- **Content sharing**: Secure file sharing between team members
- **Communication**: Integrated notification system
- **Reporting**: Analytics and usage statistics

## Quick Start

### Development Setup
```bash
# Clone repository
git clone https://github.com/your-username/athlete-hub.git
cd athlete-hub/app

# Install dependencies
npm install

# Configure environment
cp env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Production Deployment
```bash
# Build for production
npm run build

# Or deploy with Docker
docker-compose up -d

# See DEPLOY.md for complete deployment guide
```

## Technology Stack

### Frontend
- **Framework**: Next.js 15.5.2 (App Router)
- **React**: 19.1.0 with TypeScript
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide React
- **State Management**: React Context + TanStack Query

### Backend  
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (OAuth + Email/Password)
- **File Storage**: AWS S3 / Supabase Storage
- **Email**: SendGrid integration

### DevOps
- **Testing**: Jest + React Testing Library
- **CI/CD**: GitHub Actions
- **Containerization**: Docker with multi-stage builds
- **Monitoring**: Structured logging + health checks

## Project Structure

```
athlete-hub/
├── app/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages and API routes
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   ├── lib/           # Utility libraries and configs
│   │   └── types/         # TypeScript type definitions
│   ├── public/            # Static assets
│   └── __tests__/         # Test files
├── database-*.sql         # Database schema files
├── csv/                   # Sample data files
├── Dockerfile             # Production container configuration
├── docker-compose.yml     # Development environment
└── docs/                  # Documentation
```

## Available Scripts

### Development
```bash
npm run dev         # Start development server
npm run build       # Build for production  
npm run start       # Start production server
npm run lint        # Run ESLint
```

### Testing
```bash
npm run test           # Run tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci       # Run tests for CI/CD
```

### Quality & Maintenance
```bash
npm run typecheck   # TypeScript type checking
npm run audit       # Security audit
npm run outdated    # Check outdated packages
npm run clean       # Clean build artifacts
```

## Configuration

### Required Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Storage  
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name

# Optional: Email
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com

# Branding
NEXT_PUBLIC_BRAND_NAME=Your Brand Name
NEXT_PUBLIC_LOGO_PATH=/your-logo.svg
```

See `app/env.example` for complete configuration options.

## Documentation

- **[DEPLOY.md](./DEPLOY.md)** - Complete deployment guide
- **[SECURITY.md](./SECURITY.md)** - Security implementation and best practices  
- **[CHECKLIST.md](./CHECKLIST.md)** - Go-live verification checklist
- **[CHANGELOG.md](./CHANGELOG.md)** - Release notes and changes

## Contributing

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Testing**: Add tests for new functionality
- **Documentation**: Update docs for significant changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Getting Help
- **Documentation**: Check the docs/ directory
- **Issues**: Create a GitHub issue
- **Email**: support@yourdomain.com

### Community
- **Discussions**: GitHub Discussions
- **Updates**: Follow releases for latest updates

---

**Built with ❤️ for athletes and sports teams worldwide**