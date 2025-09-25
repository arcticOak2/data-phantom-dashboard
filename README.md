# Data Phantom Dashboard

React-based frontend for the Data Phantom Platform - a visual interface for managing data processing workflows, tasks, and reconciliation.

## Features

- **Visual Workflow Management**: Interactive DAG visualization with ReactFlow
- **Task Management**: Create, edit, and manage SQL tasks across multiple engines
- **Real-time Monitoring**: Live status updates and execution tracking
- **Data Reconciliation**: Visual reconciliation setup and result viewing
- **UDF Management**: Upload and manage custom User-Defined Functions
- **Authentication**: Secure login and user management
- **AI Assistant**: Integrated chat interface for query assistance

## Tech Stack

- **React**: 18.3.1
- **React Router**: Navigation and routing
- **ReactFlow**: DAG visualization
- **Monaco Editor**: SQL code editing with syntax highlighting
- **Axios**: HTTP client for API communication
- **CSS3**: Styling and responsive design

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
# Copy example configuration
cp .env.example .env

# Edit .env with your settings
REACT_APP_API_URL=http://localhost:8080
REACT_APP_AI_SERVICE_URL=http://localhost:11434
```

3. **Start development server:**
```bash
npm start
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Make sure the Data Phantom backend is running on the configured API URL

## Configuration

Create a `.env` file in the root directory:

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:8080

# AI Service URL (optional)
REACT_APP_AI_SERVICE_URL=http://localhost:11434
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:integration` - Run integration tests

## Project Structure

```
src/
├── components/          # Reusable UI components
├── services/           # API service layer
├── utils/             # Utility functions
├── assets/            # Images and static files
├── App.js             # Main application component
├── Layout.js          # Application layout
└── index.js           # Application entry point
```

## Key Components

- **TaskManager**: Main task management interface
- **TaskGraph**: Visual DAG representation
- **Reconciliation**: Data reconciliation interface
- **UDFModal**: UDF upload and management
- **ChatWindow**: AI assistant integration
- **AuthProvider**: Authentication context

## Author

**Abhijeet Kumar**
- Email: [searchabhijeet@gmail.com](mailto:searchabhijeet@gmail.com)
- LinkedIn: [@abhijeet-kumar-983b57a4](https://www.linkedin.com/in/abhijeet-kumar-983b57a4/)

## License

Apache License 2.0