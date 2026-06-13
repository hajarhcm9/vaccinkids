package com.example.vaccinkid.viewmodel

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

@OptIn(ExperimentalCoroutinesApi::class)
class MainDispatcherRule : TestRule {
    private val instantTaskExecutorRule = InstantTaskExecutorRule()
    private val dispatcher = UnconfinedTestDispatcher()

    override fun apply(base: Statement, description: Description): Statement {
        val instantStatement = instantTaskExecutorRule.apply(base, description)
        return object : Statement() {
            override fun evaluate() {
                Dispatchers.setMain(dispatcher)
                try {
                    instantStatement.evaluate()
                } finally {
                    Dispatchers.resetMain()
                }
            }
        }
    }
}
