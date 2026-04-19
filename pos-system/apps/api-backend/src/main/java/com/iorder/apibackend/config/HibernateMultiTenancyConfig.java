package com.iorder.apibackend.config;

import com.iorder.apibackend.multitenancy.SchemaMultiTenantConnectionProvider;
import com.iorder.apibackend.multitenancy.TenantIdentifierResolver;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HibernateMultiTenancyConfig {

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(
        SchemaMultiTenantConnectionProvider connectionProvider,
        TenantIdentifierResolver tenantIdentifierResolver
    ) {
        return properties -> {
            properties.put("hibernate.multiTenancy", "SCHEMA");
            properties.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, connectionProvider);
            properties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantIdentifierResolver);
        };
    }
}
