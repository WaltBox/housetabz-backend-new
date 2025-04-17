'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Step 1: Create ENUM types if they don't exist
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_houseservices_type') THEN
            CREATE TYPE enum_houseservices_type AS ENUM('fixed_recurring', 'variable_recurring', 'one_time');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_houseservices_status') THEN
            CREATE TYPE enum_houseservices_status AS ENUM('active', 'inactive', 'pending', 'cancelled');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_houseservices_billingsource') THEN
            CREATE TYPE enum_houseservices_billingsource AS ENUM('housetabz', 'partner');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_houseservices_feecategory') THEN
            CREATE TYPE enum_houseservices_feecategory AS ENUM('card', 'marketplace');
          END IF;
        END
        $$;
      `);

      // Step 2: Clear default values first
      await queryInterface.sequelize.query(`
        -- First remove defaults
        ALTER TABLE "HouseServices" ALTER COLUMN "type" DROP DEFAULT;
        ALTER TABLE "HouseServices" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "HouseServices" ALTER COLUMN "billingSource" DROP DEFAULT;
        ALTER TABLE "HouseServices" ALTER COLUMN "feeCategory" DROP DEFAULT;
      `);

      // Step 3: Update NULL values to match ENUM values (if needed)
      await queryInterface.sequelize.query(`
        -- Set NULL values to an appropriate value first
        UPDATE "HouseServices" SET "type" = 'fixed_recurring' WHERE "type" IS NULL;
        UPDATE "HouseServices" SET "status" = 'pending' WHERE "status" IS NULL;
        UPDATE "HouseServices" SET "billingSource" = 'housetabz' WHERE "billingSource" IS NULL;
        UPDATE "HouseServices" SET "feeCategory" = 'marketplace' WHERE "feeCategory" IS NULL;
      `);

      // Step 4: Convert column types to the new ENUM types
      await queryInterface.sequelize.query(`
        -- Convert columns to ENUM types
        ALTER TABLE "HouseServices" 
        ALTER COLUMN "type" TYPE enum_houseservices_type 
        USING "type"::text::enum_houseservices_type;
        
        ALTER TABLE "HouseServices" 
        ALTER COLUMN "status" TYPE enum_houseservices_status 
        USING "status"::text::enum_houseservices_status;
        
        ALTER TABLE "HouseServices" 
        ALTER COLUMN "billingSource" TYPE enum_houseservices_billingsource 
        USING "billingSource"::text::enum_houseservices_billingsource;
        
        ALTER TABLE "HouseServices" 
        ALTER COLUMN "feeCategory" TYPE enum_houseservices_feecategory 
        USING "feeCategory"::text::enum_houseservices_feecategory;
      `);

      // Step 5: Add default values back
      await queryInterface.sequelize.query(`
        -- Add defaults back after type conversion
        ALTER TABLE "HouseServices" ALTER COLUMN "type" SET DEFAULT 'fixed_recurring'::enum_houseservices_type;
        ALTER TABLE "HouseServices" ALTER COLUMN "status" SET DEFAULT 'pending'::enum_houseservices_status;
        ALTER TABLE "HouseServices" ALTER COLUMN "billingSource" SET DEFAULT 'housetabz'::enum_houseservices_billingsource;
        ALTER TABLE "HouseServices" ALTER COLUMN "feeCategory" SET DEFAULT 'marketplace'::enum_houseservices_feecategory;
      `);
      
      // Step 6: Ensure NOT NULL constraints
      await queryInterface.sequelize.query(`
        -- Set NOT NULL constraints
        ALTER TABLE "HouseServices" ALTER COLUMN "type" SET NOT NULL;
        ALTER TABLE "HouseServices" ALTER COLUMN "status" SET NOT NULL;
        ALTER TABLE "HouseServices" ALTER COLUMN "billingSource" SET NOT NULL;
        ALTER TABLE "HouseServices" ALTER COLUMN "feeCategory" SET NOT NULL;
      `);
      
      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Convert columns back to VARCHAR
      await queryInterface.sequelize.query(`
        -- Drop defaults first
        ALTER TABLE "HouseServices" ALTER COLUMN "type" DROP DEFAULT;
        ALTER TABLE "HouseServices" ALTER COLUMN "status" DROP DEFAULT;
        ALTER TABLE "HouseServices" ALTER COLUMN "billingSource" DROP DEFAULT;
        ALTER TABLE "HouseServices" ALTER COLUMN "feeCategory" DROP DEFAULT;
        
        -- Convert columns back to VARCHAR
        ALTER TABLE "HouseServices" ALTER COLUMN "type" TYPE VARCHAR(255);
        ALTER TABLE "HouseServices" ALTER COLUMN "status" TYPE VARCHAR(255);
        ALTER TABLE "HouseServices" ALTER COLUMN "billingSource" TYPE VARCHAR(255);
        ALTER TABLE "HouseServices" ALTER COLUMN "feeCategory" TYPE VARCHAR(255);
        
        -- Set defaults back as strings
        ALTER TABLE "HouseServices" ALTER COLUMN "type" SET DEFAULT 'fixed_recurring';
        ALTER TABLE "HouseServices" ALTER COLUMN "status" SET DEFAULT 'pending';
        ALTER TABLE "HouseServices" ALTER COLUMN "billingSource" SET DEFAULT 'housetabz';
        ALTER TABLE "HouseServices" ALTER COLUMN "feeCategory" SET DEFAULT 'marketplace';
      `);
      
      console.log('Rollback completed successfully!');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};