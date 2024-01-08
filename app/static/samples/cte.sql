EXPLAIN (ANALYZE,DIST, FORMAT JSON)
   WITH all_country_stats
   AS (SELECT
     c.country country_name,
     SUM(i.total) total_order,
     ROUND(AVG(i.total), 2) avg_order,
     COUNT(invoiceid) no_of_orders,
     COUNT(DISTINCT c.customerid) no_of_customers
   FROM invoice i
   JOIN customer c
     ON c.customerid = i.customerid
   GROUP BY 1),

   grouped_country
   AS (SELECT
     CASE
       WHEN no_of_customers = 1 THEN 'Other'
       ELSE country_name
     END AS grouped_country,
     *
   FROM all_country_stats)

   SELECT DISTINCT
     (grouped_country),
     SUM(no_of_customers) no_of_customers,
     SUM(no_of_orders) no_of_orders,
     SUM(total_order) total_value_order,
     ROUND(AVG(avg_order), 2) avg_order
   FROM grouped_country
   WHERE NOT grouped_country = 'Other'
   GROUP BY 1
   ORDER BY 3 DESC;