package com.iorder.apibackend.multitenancy;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SchemaMultiTenantConnectionProvider implements MultiTenantConnectionProvider<String> {
    private static final Pattern TENANT_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    private final DataSource dataSource;
    private final String defaultSchema;

    public SchemaMultiTenantConnectionProvider(
        DataSource dataSource,
        @Value("${app.multitenancy.default-schema:platform}") String defaultSchema
    ) {
        this.dataSource = dataSource;
        this.defaultSchema = defaultSchema;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection connection = getAnyConnection();
        String schema = normalizeSchema(tenantIdentifier);
        connection.setSchema(schema);
        return connection;
    }

    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) throws SQLException {
        connection.setSchema(defaultSchema);
        releaseAnyConnection(connection);
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        return null;
    }

    private String normalizeSchema(String tenantIdentifier) {
        if (tenantIdentifier == null || tenantIdentifier.isBlank()) {
            return defaultSchema;
        }
        if (!TENANT_PATTERN.matcher(tenantIdentifier).matches()) {
            return defaultSchema;
        }
        return tenantIdentifier.toLowerCase(Locale.ROOT);
    }
}
